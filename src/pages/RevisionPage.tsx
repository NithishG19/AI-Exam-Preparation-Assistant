import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Layers, Plus, RotateCcw, Eye, EyeOff, Trash2, Brain } from 'lucide-react';

const RevisionPage: React.FC = () => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [mode, setMode] = useState<'list' | 'review' | 'create'>('list');
  const [form, setForm] = useState({ front: '', back: '', subject: '', topic: '' });

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English'];

  useEffect(() => {
    if (user) fetchCards();
  }, [user]);

  const fetchCards = async () => {
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', user!.id)
      .order('next_review_date');
    setFlashcards(data || []);
    setDueCards((data || []).filter(c => new Date(c.next_review_date) <= new Date()));
  };

  const createCard = async () => {
    if (!form.front || !form.back || !form.subject) return;
    await supabase.from('flashcards').insert({
      user_id: user!.id,
      front: form.front,
      back: form.back,
      subject: form.subject,
      topic: form.topic,
    });
    toast({ title: 'Flashcard created!' });
    setForm({ front: '', back: '', subject: '', topic: '' });
    fetchCards();
    setMode('list');
  };

  const reviewCard = async (quality: number) => {
    // SM-2 spaced repetition algorithm
    const card = dueCards[reviewIdx];
    let { ease_factor, interval_days, repetitions } = card;

    if (quality >= 3) {
      if (repetitions === 0) interval_days = 1;
      else if (repetitions === 1) interval_days = 6;
      else interval_days = Math.round(interval_days * ease_factor);
      repetitions += 1;
    } else {
      repetitions = 0;
      interval_days = 1;
    }

    ease_factor = Math.max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval_days);

    await supabase.from('flashcards').update({
      ease_factor,
      interval_days,
      repetitions,
      next_review_date: nextReview.toISOString(),
    }).eq('id', card.id);

    if (reviewIdx < dueCards.length - 1) {
      setReviewIdx(i => i + 1);
      setShowBack(false);
    } else {
      toast({ title: 'Review complete!', description: 'All due cards reviewed.' });
      setMode('list');
      fetchCards();
    }
  };

  const deleteCard = async (id: string) => {
    await supabase.from('flashcards').delete().eq('id', id);
    fetchCards();
  };

  if (mode === 'review' && dueCards.length > 0) {
    const card = dueCards[reviewIdx];
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">Review</h1>
          <span className="text-sm text-muted-foreground">{reviewIdx + 1} / {dueCards.length}</span>
        </div>

        <Card className="border-0 shadow-lg min-h-[300px] flex flex-col">
          <CardContent className="p-8 flex-1 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-muted-foreground mb-4">{card.subject} • {card.topic}</span>
            <p className="text-xl font-display font-semibold text-foreground">{card.front}</p>
            {showBack && (
              <div className="mt-6 pt-6 border-t border-border w-full animate-fade-in">
                <p className="text-foreground">{card.back}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {!showBack ? (
          <Button variant="hero" className="w-full" onClick={() => setShowBack(true)}>
            <Eye className="h-4 w-4 mr-2" /> Show Answer
          </Button>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <Button variant="destructive" onClick={() => reviewCard(1)}>Hard</Button>
            <Button variant="outline" onClick={() => reviewCard(3)}>Good</Button>
            <Button variant="success" onClick={() => reviewCard(5)}>Easy</Button>
          </div>
        )}

        <Button variant="ghost" className="w-full" onClick={() => { setMode('list'); setReviewIdx(0); setShowBack(false); }}>
          Back to Cards
        </Button>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
        <h1 className="text-2xl font-display font-bold text-foreground">Create Flashcard</h1>
        <Card className="border-0 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Select value={form.subject} onValueChange={v => setForm(f => ({ ...f, subject: v }))}>
                <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Topic</label>
              <Input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g., Calculus" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Front (Question)</label>
              <Textarea value={form.front} onChange={e => setForm(f => ({ ...f, front: e.target.value }))} placeholder="What is the derivative of sin(x)?" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Back (Answer)</label>
              <Textarea value={form.back} onChange={e => setForm(f => ({ ...f, back: e.target.value }))} placeholder="cos(x)" />
            </div>
            <div className="flex gap-3">
              <Button variant="hero" onClick={createCard}>Create Card</Button>
              <Button variant="outline" onClick={() => setMode('list')}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Revision</h1>
          <p className="text-muted-foreground">Flashcards with spaced repetition</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMode('create')}>
            <Plus className="h-4 w-4 mr-1" /> New Card
          </Button>
          {dueCards.length > 0 && (
            <Button variant="hero" onClick={() => { setMode('review'); setReviewIdx(0); setShowBack(false); }}>
              <Brain className="h-4 w-4 mr-1" /> Review ({dueCards.length} due)
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-display font-bold text-foreground">{flashcards.length}</p>
            <p className="text-xs text-muted-foreground">Total Cards</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-display font-bold text-primary">{dueCards.length}</p>
            <p className="text-xs text-muted-foreground">Due Today</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md">
          <CardContent className="p-5 text-center">
            <p className="text-2xl font-display font-bold text-success">{flashcards.length - dueCards.length}</p>
            <p className="text-xs text-muted-foreground">Reviewed</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards list */}
      {flashcards.length === 0 ? (
        <Card className="border-0 shadow-md">
          <CardContent className="p-8 text-center text-muted-foreground">
            <Layers className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No flashcards yet. Create your first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {flashcards.map(card => (
            <Card key={card.id} className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">{card.subject} • {card.topic}</span>
                    <p className="font-medium text-foreground mt-1">{card.front}</p>
                    <p className="text-sm text-muted-foreground mt-2">{card.back}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteCard(card.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevisionPage;
