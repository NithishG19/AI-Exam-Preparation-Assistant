import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, ArrowRight, RotateCcw, Trophy } from 'lucide-react';

interface Question {
  id: string;
  subject: string;
  topic: string;
  question: string;
  options: string[];
  correct_answer: number;
  difficulty: string;
  explanation: string;
}

const QuizPage: React.FC = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState<'setup' | 'quiz' | 'result'>('setup');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; selected: number; correct: boolean }[]>([]);
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [questionCount, setQuestionCount] = useState('5');
  const [isMock, setIsMock] = useState(false);
  const [timer, setTimer] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English'];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive) {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const startQuiz = async () => {
    const requested = parseInt(questionCount);
    let query = supabase.from('quiz_questions').select('*');
    if (subject && subject !== 'all') query = query.eq('subject', subject);
    if (difficulty !== 'adaptive') query = query.eq('difficulty', difficulty);

    let { data, error } = await query.limit(requested * 3); // fetch extra to ensure enough after shuffle
    if (error || !data?.length) {
      toast({ title: 'No questions found', description: 'Try different filters', variant: 'destructive' });
      return;
    }

    // Shuffle and take requested count
    const shuffled = data
      .sort(() => Math.random() - 0.5)
      .slice(0, requested)
      .map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options as string),
      })) as Question[];

    if (shuffled.length < requested) {
      toast({
        title: `Only ${shuffled.length} questions available`,
        description: `Found ${shuffled.length} of ${requested} requested. Starting with what's available.`,
      });
    }

    setQuestions(shuffled);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
    setTimer(0);
    setTimerActive(true);
    setMode('quiz');
  };

  const submitAnswer = () => {
    if (selectedAnswer === null) return;
    const q = questions[currentIdx];
    const correct = selectedAnswer === q.correct_answer;
    setAnswers(prev => [...prev, { questionId: q.id, selected: selectedAnswer, correct, topic: q.topic, subject: q.subject }]);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setTimerActive(false);
    setMode('result');
    const score = answers.filter(a => a.correct).length;
    
    await supabase.from('quiz_attempts').insert({
      user_id: user!.id,
      subject: subject || 'Mixed',
      difficulty,
      score,
      total_questions: questions.length,
      time_taken_seconds: timer,
      is_mock_exam: isMock,
      answers: answers as any,
    });

    await supabase.from('study_sessions').insert({
      user_id: user!.id,
      subject: subject || 'Mixed',
      duration_minutes: Math.ceil(timer / 60),
      activity_type: isMock ? 'mock_exam' : 'quiz',
    });
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const score = answers.filter(a => a.correct).length;
  const currentQ = questions[currentIdx];

  if (mode === 'setup') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Quiz & Practice</h1>
          <p className="text-muted-foreground">Test your knowledge with adaptive questions</p>
        </div>

        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="font-display">Configure Quiz</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger><SelectValue placeholder="All subjects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Questions</label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="15">15 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                  <SelectItem value="25">25 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="hero" className="flex-1" onClick={() => { setIsMock(false); startQuiz(); }}>
                Start Quiz
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setIsMock(true); startQuiz(); }}>
                Mock Exam
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (mode === 'result') {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <Card className="border-0 shadow-md overflow-hidden">
          <div className={`p-8 text-center ${percentage >= 70 ? 'gradient-secondary' : percentage >= 40 ? 'gradient-accent' : 'bg-destructive'}`}>
            <Trophy className="h-16 w-16 mx-auto mb-4 text-primary-foreground" />
            <h1 className="text-3xl font-display font-bold text-primary-foreground">Quiz Complete!</h1>
            <p className="text-6xl font-display font-bold text-primary-foreground mt-4">{percentage}%</p>
            <p className="text-primary-foreground/80 mt-2">{score} / {questions.length} correct • {formatTime(timer)}</p>
          </div>
          <CardContent className="p-6 space-y-4">
            {questions.map((q, i) => {
              const ans = answers[i];
              return (
                <div key={q.id} className={`p-4 rounded-lg ${ans?.correct ? 'bg-success/5 border border-success/20' : 'bg-destructive/5 border border-destructive/20'}`}>
                  <div className="flex items-start gap-2">
                    {ans?.correct ? <CheckCircle className="h-5 w-5 text-success mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive mt-0.5" />}
                    <div>
                      <p className="font-medium text-foreground text-sm">{q.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">{q.explanation}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <Button variant="hero" className="w-full" onClick={() => { setMode('setup'); setAnswers([]); }}>
              <RotateCcw className="h-4 w-4 mr-2" /> Take Another Quiz
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Progress bar */}
      <div className="flex items-center gap-4">
        <Progress value={((currentIdx + 1) / questions.length) * 100} className="flex-1" />
        <span className="text-sm font-medium text-muted-foreground">{currentIdx + 1}/{questions.length}</span>
        <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
          <Clock className="h-4 w-4" /> {formatTime(timer)}
        </span>
      </div>

      {/* Question */}
      <Card className="border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <span className={`text-xs px-2 py-1 rounded-full ${
              currentQ.difficulty === 'easy' ? 'bg-success/10 text-success' :
              currentQ.difficulty === 'medium' ? 'bg-warning/10 text-warning' :
              'bg-destructive/10 text-destructive'
            }`}>{currentQ.difficulty}</span>
            <span className="text-xs text-muted-foreground">{currentQ.subject} • {currentQ.topic}</span>
          </div>
          <CardTitle className="font-display text-lg mt-3">{currentQ.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              disabled={showExplanation}
              onClick={() => setSelectedAnswer(i)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                showExplanation
                  ? i === currentQ.correct_answer
                    ? 'border-success bg-success/5'
                    : i === selectedAnswer
                    ? 'border-destructive bg-destructive/5'
                    : 'border-border'
                  : selectedAnswer === i
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  showExplanation
                    ? i === currentQ.correct_answer ? 'bg-success text-success-foreground' :
                      i === selectedAnswer ? 'bg-destructive text-destructive-foreground' : 'bg-muted text-muted-foreground'
                    : selectedAnswer === i ? 'gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="text-sm text-foreground">{opt}</span>
              </div>
            </button>
          ))}

          {showExplanation && (
            <div className="mt-4 p-4 rounded-lg bg-info/5 border border-info/20 animate-fade-in">
              <p className="text-sm font-medium text-info">Explanation</p>
              <p className="text-sm text-foreground mt-1">{currentQ.explanation}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            {!showExplanation ? (
              <Button variant="hero" className="flex-1" onClick={submitAnswer} disabled={selectedAnswer === null}>
                Submit Answer
              </Button>
            ) : (
              <Button variant="hero" className="flex-1" onClick={nextQuestion}>
                {currentIdx < questions.length - 1 ? (
                  <>Next Question <ArrowRight className="h-4 w-4 ml-1" /></>
                ) : (
                  'Finish Quiz'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

<Button
  onClick={async () => {
    console.log("TEST CLICK");

    const { data, error } = await supabase
      .from('quiz_attempts')
      .insert([
        { user_id: user?.id, subject: "Test", score: 5 }
      ]);

    console.log("DATA:", data);
    console.log("ERROR:", error);
  }}
>
  Test Insert
</Button>
export default QuizPage;
