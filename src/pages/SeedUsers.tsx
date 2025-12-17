import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const SeedUsers = () => {
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const seedUsers = async () => {
        setLoading(true);
        setLogs([]);
        addLog('Starting seed process...');

        const showroomId = '01b34d13-7695-4682-b8fd-f112701a0f4a';
        const users = [
            { email: 'admin@showroom2.com', password: 'password123', name: 'Showroom 2 Admin', role: 'admin' },
            { email: 'worker1@showroom2.com', password: 'password123', name: 'Worker One', role: 'worker' },
            { email: 'worker2@showroom2.com', password: 'password123', name: 'Worker Two', role: 'worker' },
        ];

        try {
            for (const user of users) {
                addLog(`Creating ${user.email}...`);

                // 1. Sign Up
                const { data, error } = await supabase.auth.signUp({
                    email: user.email,
                    password: user.password,
                    options: {
                        data: {
                            name: user.name,
                            role: user.role,
                            showroom_id: showroomId,
                        }
                    }
                });

                if (error) {
                    addLog(`Error creating ${user.email}: ${error.message}`);
                    console.error(error);
                    continue; // Continue to next user
                }

                if (data.user) {
                    addLog(`Success! User created: ${data.user.id}`);

                    // 2. If Admin, force role update (since triggers default to worker)
                    if (user.role === 'admin') {
                        addLog(`Upgrading ${user.email} to admin...`);
                        const { error: updateError } = await supabase
                            .from('profiles')
                            .update({ role: 'admin' })
                            .eq('id', data.user.id);

                        if (updateError) {
                            addLog(`Failed to update profile role: ${updateError.message}`);
                        } else {
                            addLog(`Profile role updated to admin.`);
                        }

                        const { error: roleError } = await supabase
                            .from('user_roles')
                            .upsert({ user_id: data.user.id, role: 'admin' });

                        if (roleError) {
                            addLog(`Failed to update user_roles: ${roleError.message}`);
                        } else {
                            addLog(`user_roles updated to admin.`);
                        }
                    }
                }
            }
            addLog('Seed process completed!');
            toast.success('Users created successfully');
        } catch (err: any) {
            addLog(`Critical error: ${err.message}`);
            toast.error('Failed to seed users');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle>Seed Showroom 2 Users</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        This will create Admin and Worker users for Showroom 2 directly via the App SDK.
                    </p>
                    <Button
                        onClick={seedUsers}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? 'Creating Users...' : 'Create Users'}
                    </Button>

                    <div className="mt-4 p-4 bg-black text-green-400 font-mono text-xs rounded-md h-64 overflow-y-auto">
                        {logs.length === 0 ? 'Ready to start...' : logs.map((log, i) => (
                            <div key={i}>{log}</div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SeedUsers;
