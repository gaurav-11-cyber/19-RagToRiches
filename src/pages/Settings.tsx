import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, LogOut, FileText, Trash2, Globe } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/ui/bottom-nav';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useLanguagePreference, LANGUAGE_OPTIONS, Language } from '@/hooks/useLanguagePreference';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const { language, setLanguage } = useLanguagePreference();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteAllChats = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', user.id);

    if (!error) {
      toast({
        title: 'All chats deleted',
        description: 'Your chat history has been cleared.',
      });
    }
    setIsDeleting(false);
  };

  return (
    <div className="min-h-screen gradient-bg pb-24">
      {/* Header */}
      <header className="px-4 py-4 flex items-center gap-4">
        <button 
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-foreground" />
        </button>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
      </header>

      {/* Profile section */}
      <main className="px-6 py-4 space-y-6">
        {/* User info */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Account</h3>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Language Preference */}
        <div className="glass-card rounded-2xl p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
              <Globe className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-gray-800">Response Language</h3>
              <p className="text-sm text-gray-500">Choose AI response language</p>
            </div>
            <Select value={language} onValueChange={(val) => setLanguage(val as Language)}>
              <SelectTrigger className="w-32 glass-card border-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.nativeLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => navigate('/documents')}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/90 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-gray-800">Manage Documents</h3>
              <p className="text-sm text-gray-500">Upload and manage your files</p>
            </div>
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 hover:bg-white/90 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-medium text-gray-800">Delete All Chats</h3>
                  <p className="text-sm text-gray-500">Remove all chat history</p>
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="glass-card border-0">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-gray-800">Delete all chats?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-600">
                  This action cannot be undone. All your chat history will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllChats}
                  disabled={isDeleting}
                  className="rounded-full bg-red-500 hover:bg-red-600"
                >
                  {isDeleting ? 'Deleting...' : 'Delete All'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Sign out */}
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full h-12 rounded-full glass-card border-0 text-red-500 font-medium hover:bg-red-50"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Settings;
