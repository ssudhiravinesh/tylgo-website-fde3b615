import { useState } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { useAuth } from "@/hooks/useAuth";
import { useSessionManagement } from "@/hooks/useSessionManagement";
import { useStrictSessionManagement } from "@/hooks/useStrictSessionManagement"; // Add this import

const Index = () => {
  const { user, profile, signOut, loading } = useAuth();
  const [showSignUp, setShowSignUp] = useState(false);
  
  // Initialize both session management hooks
  useSessionManagement();
  const { createSession, validateSession, invalidateSession } = useStrictSessionManagement(); // Use this hook

  const handleLogoutClick = async () => {
    try {
      // Invalidate the current session before signing out
      if (user?.id) {
        await invalidateSession(user.id);
      }
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          {/* Tile Loading Animation */}
          <div style={styles.tilesContainer}>
            {[...Array(12)].map((_, index) => (
              <div
                key={index}
                style={{
                  ...styles.tile,
                  ...styles[`tile${index % 3 === 0 ? 'Blue' : index % 3 === 1 ? 'Beige' : 'Light'}`],
                  animationDelay: `${index * 0.08}s`
                }}
              />
            ))}
          </div>
          
          <p style={styles.loadingText}>Loading...</p>
          
          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
        </div>
      </div>
    );
  }
  
  // If not authenticated, show login/signup forms
  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        {showSignUp ? (
          <SignUpForm onShowLogin={() => setShowSignUp(false)} />
        ) : (
          <LoginForm 
            onShowSignUp={() => setShowSignUp(true)} 
            onSuccessfulLogin={createSession} // Pass the createSession function
          />
        )}
      </div>
    );
  }

  return (
    <Dashboard user={profile} onLogout={handleLogoutClick} />
  );
};

// Inline styles with keyframe animations (keeping your existing styles)
const styles = {
  tilesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 20px)',
    gridTemplateRows: 'repeat(3, 20px)',
    gap: '8px',
    justifyContent: 'center',
    marginBottom: '24px',
  },
  tile: {
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    animation: 'tileAnimation 1.2s ease-in-out infinite',
  },
  tileBlue: {
    backgroundColor: '#3B82F6',
  },
  tileBeige: {
    backgroundColor: '#F5F5DC',
  },
  tileLight: {
    backgroundColor: '#93C5FD',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '16px',
  },
  progressBar: {
    width: '200px',
    height: '4px',
    backgroundColor: '#E5E7EB',
    borderRadius: '2px',
    overflow: 'hidden',
    margin: '0 auto',
  },
  progressFill: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(90deg, #3B82F6, #93C5FD, #3B82F6)',
    backgroundSize: '200% 100%',
    animation: 'progressFlow 2s linear infinite',
  },
};

// Add keyframe animations using a style tag
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes tileAnimation {
    0%, 80%, 100% {
      transform: scale(1) rotate(0deg);
      opacity: 0.7;
    }
    40% {
      transform: scale(1.2) rotate(180deg);
      opacity: 1;
    }
  }
  
  @keyframes progressFlow {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;
document.head.appendChild(styleSheet);

export default Index;