
import { useState, useEffect } from "react";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Index = () => {
  const { user, profile, signOut, loading, signIn, createDefaultUsers } = useAuth();
  const [isAutoLogging, setIsAutoLogging] = useState(false);

  // Auto-create default users if they don't exist
  useEffect(() => {
    const initializeDefaultUsers = async () => {
      if (!user && !loading && !isAutoLogging) {
        console.log('Initializing default users...');
        await createDefaultUsers();
      }
    };

    initializeDefaultUsers();
  }, [user, loading, isAutoLogging, createDefaultUsers]);

  const handleLogoutClick = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // // Show loading state while checking authentication
  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
  //       <div className="text-center">
  //         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
  //         <p className="text-gray-600">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }
//// new addition:
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

  
  // If not authenticated, show device selection
  if (!user || !profile) {
    const handleDeviceLogin = async (email: string, password: string, deviceName: string) => {
      setIsAutoLogging(true);
      try {
        await signIn(email, password);
        console.log(`Successfully logged in as ${deviceName}`);
      } catch (error: any) {
        console.error('Login error:', error);
        if (error.message?.includes('Invalid login credentials')) {
          toast.error('User not found. Creating user...');
          // User doesn't exist, create them first
          try {
            await createDefaultUsers();
            // Wait a moment for user creation
            await new Promise(resolve => setTimeout(resolve, 1000));
            // Try login again
            await signIn(email, password);
            console.log(`Successfully logged in as ${deviceName} after creation`);
          } catch (createError) {
            console.error('Failed to create and login user:', createError);
            toast.error('Failed to create user account');
          }
        } else {
          toast.error(error.message || 'Login failed');
        }
      } finally {
        setIsAutoLogging(false);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="flex flex-col items-center pb-4">
            <img src="/tylgo.svg" className="w-8 h-8 mb-2" />
            <CardTitle className="text-2xl font-bold text-gray-800">
              TYL
              <span style={{ color: "#2563eb", fontWeight: "bold" }}>G</span>
              O
            </CardTitle>
            <CardDescription className="text-gray-600">
              Select your device to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => handleDeviceLogin('worker1@gmail.com', '123456789', 'Worker Device')}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={isAutoLogging}
            >
              {isAutoLogging ? 'Logging in...' : 'Login as Worker'}
            </Button>
            <Button 
              onClick={() => handleDeviceLogin('gavaskar@gmail.com', '123456789', 'Admin Device')}
              className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              disabled={isAutoLogging}
            >
              {isAutoLogging ? 'Logging in...' : 'Login as Admin'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Dashboard user={profile} onLogout={handleLogoutClick} />
  );
};

// Inline styles with keyframe animations
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
