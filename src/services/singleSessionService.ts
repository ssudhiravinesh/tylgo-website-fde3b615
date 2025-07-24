/**
 * Single Session Management Service
 * Implements exactly one active session per user with immediate invalidation
 */

import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface SessionInfo {
  sessionToken: string;
  userId: string;
  expiresAt: Date;
  tokenVersion: number;
}

export interface SessionValidationResult {
  isValid: boolean;
  tokenVersion: number;
  expiresAt: Date | null;
  shouldSignOut: boolean;
}

export class SingleSessionService {
  private static instance: SingleSessionService;
  private currentSession: SessionInfo | null = null;
  private realtimeChannel: any = null;
  private lastActivityUpdate = 0;
  private readonly ACTIVITY_THROTTLE_MS = 60000; // 1 minute
  
  private constructor() {}

  static getInstance(): SingleSessionService {
    if (!SingleSessionService.instance) {
      SingleSessionService.instance = new SingleSessionService();
    }
    return SingleSessionService.instance;
  }

  /**
   * Create a new session, invalidating all other sessions for the user
   */
  async createSession(userId: string): Promise<SessionInfo> {
    console.log('🔐 Creating new single session for user:', userId);
    
    // Generate secure session token
    const sessionToken = this.generateSecureToken();
    
    // Session expires in 24 hours (absolute timeout)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    try {
      // Use the new single session creation function
      const { data, error } = await supabase.rpc('create_single_session', {
        p_user_id: userId,
        p_session_token: sessionToken,
        p_expires_at: expiresAt.toISOString()
      });

      if (error) {
        console.error('❌ Failed to create session:', error);
        throw new Error(`Failed to create session: ${error.message}`);
      }

      // Get the invalidated tokens for notification
      const invalidatedTokens = data?.[0]?.invalidated_tokens || [];
      console.log('🔄 Invalidated tokens:', invalidatedTokens.length);

      // Get updated token version
      const { data: profileData } = await supabase
        .from('profiles')
        .select('token_version')
        .eq('id', userId)
        .single();

      const tokenVersion = profileData?.token_version || 0;

      this.currentSession = {
        sessionToken,
        userId,
        expiresAt,
        tokenVersion
      };

      // Set up realtime monitoring for this session
      this.setupRealtimeMonitoring(userId, sessionToken);

      console.log('✅ Session created successfully');
      return this.currentSession;

    } catch (error) {
      console.error('❌ Session creation failed:', error);
      throw error;
    }
  }

  /**
   * Validate current session and check for invalidation
   */
  async validateSession(): Promise<SessionValidationResult> {
    if (!this.currentSession) {
      return {
        isValid: false,
        tokenVersion: 0,
        expiresAt: null,
        shouldSignOut: true
      };
    }

    try {
      const { data, error } = await supabase.rpc('validate_single_session', {
        p_user_id: this.currentSession.userId,
        p_session_token: this.currentSession.sessionToken
      });

      if (error) {
        console.error('❌ Session validation error:', error);
        return {
          isValid: false,
          tokenVersion: 0,
          expiresAt: null,
          shouldSignOut: true
        };
      }

      const result = data?.[0];
      if (!result) {
        return {
          isValid: false,
          tokenVersion: 0,
          expiresAt: null,
          shouldSignOut: true
        };
      }

      const { is_valid, token_version, expires_at } = result;

      // Check if token version has changed (indicating session invalidation)
      const shouldSignOut = !is_valid || 
        (this.currentSession.tokenVersion !== token_version);

      if (shouldSignOut) {
        console.log('🚫 Session invalidated - token version mismatch or invalid session');
        this.clearSession();
      } else {
        // Update local session info
        this.currentSession.tokenVersion = token_version;
        this.currentSession.expiresAt = new Date(expires_at);
      }

      return {
        isValid: is_valid && !shouldSignOut,
        tokenVersion: token_version,
        expiresAt: expires_at ? new Date(expires_at) : null,
        shouldSignOut
      };

    } catch (error) {
      console.error('❌ Session validation failed:', error);
      return {
        isValid: false,
        tokenVersion: 0,
        expiresAt: null,
        shouldSignOut: true
      };
    }
  }

  /**
   * Invalidate all sessions for the current user
   */
  async invalidateAllSessions(reason = 'manual_logout'): Promise<void> {
    if (!this.currentSession) return;

    console.log('🔄 Invalidating all sessions for user:', this.currentSession.userId);

    try {
      const { error } = await supabase.rpc('invalidate_all_user_sessions', {
        p_user_id: this.currentSession.userId,
        p_reason: reason
      });

      if (error) {
        console.error('❌ Failed to invalidate sessions:', error);
        throw error;
      }

      this.clearSession();
      console.log('✅ All sessions invalidated');

    } catch (error) {
      console.error('❌ Session invalidation failed:', error);
      throw error;
    }
  }

  /**
   * Get current session info
   */
  getCurrentSession(): SessionInfo | null {
    return this.currentSession;
  }

  /**
   * Clear local session data
   */
  clearSession(): void {
    console.log('🧹 Clearing local session data');
    this.currentSession = null;
    this.cleanupRealtime();
  }

  /**
   * Setup realtime monitoring for session invalidation
   */
  private setupRealtimeMonitoring(userId: string, sessionToken: string): void {
    // Clean up existing channel
    this.cleanupRealtime();

    console.log('📡 Setting up realtime monitoring for session invalidation');

    this.realtimeChannel = supabase
      .channel(`session-monitoring-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📨 Session change detected:', payload);
          
          // Check if our current session was invalidated
          if (payload.new?.session_token === sessionToken && 
              payload.new?.is_active === false) {
            console.log('🚫 Current session invalidated by another login');
            this.handleSessionInvalidation(payload.new?.invalidation_reason || 'unknown');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_sessions',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('📨 New session created for user:', payload);
          
          // If a new session was created and it's not our current session,
          // it means we've been logged out
          if (payload.new?.session_token !== sessionToken) {
            console.log('🚫 New session detected - current session invalidated');
            this.handleSessionInvalidation('new_login');
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
      });
  }

  /**
   * Handle session invalidation from realtime events
   */
  private handleSessionInvalidation(reason: string): void {
    console.log(`🚫 Session invalidated: ${reason}`);
    this.clearSession();
    
    // Dispatch custom event for app to handle
    window.dispatchEvent(new CustomEvent('session-invalidated', {
      detail: { reason }
    }));
  }

  /**
   * Cleanup realtime subscriptions
   */
  private cleanupRealtime(): void {
    if (this.realtimeChannel) {
      console.log('🧹 Cleaning up realtime channel');
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Update activity timestamp (throttled to avoid excessive writes)
   */
  async updateActivity(): Promise<void> {
    const now = Date.now();
    if (now - this.lastActivityUpdate < this.ACTIVITY_THROTTLE_MS) {
      return; // Throttled
    }

    if (!this.currentSession) return;

    this.lastActivityUpdate = now;
    
    // The validation function already updates activity, so just validate
    await this.validateSession();
  }

  /**
   * Generate a cryptographically secure session token
   */
  private generateSecureToken(): string {
    // Generate 128-bit random token
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    
    // Convert to hex string
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Check idle timeout (30 minutes of inactivity)
   */
  async checkIdleTimeout(): Promise<boolean> {
    if (!this.currentSession) return false;

    const validation = await this.validateSession();
    if (!validation.isValid) {
      return true; // Session expired
    }

    // Check if we've been idle for more than 30 minutes
    const idleTime = Date.now() - this.lastActivityUpdate;
    const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

    if (idleTime > IDLE_TIMEOUT_MS) {
      console.log('⏰ Session expired due to idle timeout');
      await this.invalidateAllSessions('idle_timeout');
      return true;
    }

    return false;
  }

  /**
   * Cleanup method for component unmounting
   */
  cleanup(): void {
    this.cleanupRealtime();
    this.currentSession = null;
  }
}

// Export singleton instance
export const singleSessionService = SingleSessionService.getInstance();