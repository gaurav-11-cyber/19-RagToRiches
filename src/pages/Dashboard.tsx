import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, ArrowRight, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import BottomNav from '@/components/ui/bottom-nav';
import ChatHistoryTag from '@/components/dashboard/ChatHistoryTag';
import ExploreCard from '@/components/dashboard/ExploreCard';
import { Button } from '@/components/ui/button';

import exploreStockMarket from '@/assets/explore-stock-market.jpg';
import exploreGoldPrices from '@/assets/explore-gold-prices.jpg';
import exploreLatestNews from '@/assets/explore-latest-news.jpg';
import explorePolitics from '@/assets/explore-politics.jpg';

interface Chat {
  id: string;
  title: string;
  created_at: string;
}

interface Profile {
  full_name: string | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chats, setChats] = useState<Chat[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch recent chats
      const { data: chatsData } = await supabase
        .from('chats')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      if (chatsData) {
        setChats(chatsData);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getName = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ')[0];
    }
    return user?.email?.split('@')[0] || 'User';
  };

  const handleNewChat = async () => {
    if (!user) return;

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title: 'New Chat',
      })
      .select()
      .single();

    if (!error && newChat) {
      navigate(`/chat/${newChat.id}`);
    }
  };

  return (
    <div className="min-h-screen gradient-bg pb-24">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground italic">
            {getGreeting()},
          </h1>
          <h2 className="text-2xl font-bold text-foreground italic">
            {getName()}.
          </h2>
        </div>
        <button 
          onClick={() => navigate('/settings')}
          className="w-12 h-12 rounded-full glass-card flex items-center justify-center"
        >
          <User className="w-6 h-6 text-gray-600" />
        </button>
      </header>

      {/* Main content */}
      <main className="px-6 space-y-8">
        {/* New Chat button */}
        <Button
          onClick={handleNewChat}
          className="w-full h-12 rounded-full glass-card border-0 text-gray-700 font-medium hover:bg-white/90"
          variant="outline"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Chat
        </Button>

        {/* Chat History */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Chat history</h3>
            <button 
              onClick={() => navigate('/saved')}
              className="w-8 h-8 rounded-full glass-card flex items-center justify-center"
            >
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          {loading ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 w-32 rounded-full shimmer" />
              ))}
            </div>
          ) : chats.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {chats.map((chat) => (
                <ChatHistoryTag
                  key={chat.id}
                  title={chat.title}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No chats yet. Start a new conversation!</p>
          )}
        </section>

        {/* Explore */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-foreground">Explore</h3>
            <button className="w-8 h-8 rounded-full glass-card flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <ExploreCard imageSrc={exploreStockMarket} alt="Stock Market Updates" onClick={() => navigate('/stock-market')} />
            <ExploreCard imageSrc={exploreGoldPrices} alt="Gold Prices" onClick={() => navigate('/gold-prices')} />
            <ExploreCard imageSrc={exploreLatestNews} alt="Latest News" onClick={() => navigate('/latest-news')} />
            <ExploreCard imageSrc={explorePolitics} alt="Politics" onClick={() => navigate('/politics')} />
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
