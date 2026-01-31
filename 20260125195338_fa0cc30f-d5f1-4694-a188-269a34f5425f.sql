-- Create saved_answers table for knowledge cards
CREATE TABLE public.saved_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_info JSONB,
  chat_id UUID REFERENCES public.chats(id) ON DELETE SET NULL,
  message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.saved_answers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved answers" 
ON public.saved_answers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved answers" 
ON public.saved_answers 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved answers" 
ON public.saved_answers 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_saved_answers_user_id ON public.saved_answers(user_id);
CREATE INDEX idx_saved_answers_created_at ON public.saved_answers(created_at DESC);