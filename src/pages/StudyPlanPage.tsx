import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Calendar, Plus, Check, Clock, Trash2, Brain, Sparkles } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { useWeaknessAnalysis } from '@/hooks/useWeaknessAnalysis';
import { WeaknessReport } from '@/components/WeaknessReport';

const StudyPlanPage: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', subject: '', duration: '60', date: format(new Date(), 'yyyy-MM-dd') });
  const [generating, setGenerating] = useState(false);
  const [showWeakness, setShowWeakness] = useState(false);
  const weakness = useWeaknessAnalysis();

  const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'English'];

  useEffect(() => {
    if (!user) return;
    fetchPlans();
  }, [user]);

  const fetchPlans = async () => {
    const { data } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', user!.id)
      .order('scheduled_date')
      .order('created_at');
    setPlans(data || []);
  };

  const createPlan = async () => {
    if (!formData.title || !formData.subject) return;
    const { error } = await supabase.from('study_plans').insert({
      user_id: user!.id,
      title: formData.title,
      subject: formData.subject,
      scheduled_date: formData.date,
      duration_minutes: parseInt(formData.duration),
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Plan created!' });
    setShowForm(false);
    setFormData({ title: '', subject: '', duration: '60', date: format(new Date(), 'yyyy-MM-dd') });
    fetchPlans();
  };

  const toggleStatus = async (plan: any) => {
    const nextStatus = plan.status === 'pending' ? 'in_progress' : plan.status === 'in_progress' ? 'completed' : 'pending';
    await supabase.from('study_plans').update({ status: nextStatus }).eq('id', plan.id);
    if (nextStatus === 'completed') {
      await supabase.from('study_sessions').insert({
        user_id: user!.id,
        subject: plan.subject,
        duration_minutes: plan.duration_minutes,
        activity_type: 'study',
      });
    }
    fetchPlans();
  };

  const deletePlan = async (id: string) => {
    await supabase.from('study_plans').delete().eq('id', id);
    fetchPlans();
  };

  const generateAIPlan = async () => {
    setGenerating(true);
    try {
      const plans: any[] = [];

      // Build weighted subject list based on weakness analysis
      // Weak subjects get more sessions, strong ones get fewer
      const subjectWeights: { subject: string; weight: number; topics: string[] }[] = [];

      if (weakness.hasEnoughData && weakness.subjects.length > 0) {
        weakness.subjects.forEach(s => {
          // Inverse weighting: lower accuracy = higher weight
          let weight = 1;
          if (s.level === 'critical') weight = 4;
          else if (s.level === 'weak') weight = 3;
          else if (s.level === 'average') weight = 2;
          else if (s.level === 'strong') weight = 1;
          else weight = 0.5;

          const weakTopics = s.topicBreakdown
            .filter(t => t.level === 'critical' || t.level === 'weak')
            .map(t => t.topic);

          subjectWeights.push({
            subject: s.subject,
            weight,
            topics: weakTopics.length > 0 ? weakTopics : s.topicBreakdown.map(t => t.topic).slice(0, 3),
          });
        });
      } else {
        // Default balanced plan if no data
        subjects.forEach(s => {
          subjectWeights.push({ subject: s, weight: 1, topics: [] });
        });
      }

      // Build expanded list weighted by weakness
      const weightedSubjects: typeof subjectWeights = [];
      subjectWeights.forEach(sw => {
        const count = Math.ceil(sw.weight);
        for (let i = 0; i < count; i++) weightedSubjects.push(sw);
      });

      // Shuffle
      for (let i = weightedSubjects.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [weightedSubjects[i], weightedSubjects[j]] = [weightedSubjects[j], weightedSubjects[i]];
      }

      // Generate 10-day plan
      const daysCount = 10;
      const sessionsPerDay = 2;

      // Topic suggestions for subjects without quiz history
      const defaultTopics: Record<string, string[]> = {
        Mathematics: ['Algebra', 'Calculus', 'Geometry', 'Statistics', 'Trigonometry', 'Number Theory'],
        Physics: ['Mechanics', 'Thermodynamics', 'Optics', 'Electromagnetism', 'Waves', 'Modern Physics'],
        Chemistry: ['Organic Reactions', 'Chemical Bonding', 'Stoichiometry', 'Electrochemistry', 'Periodic Trends'],
        Biology: ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'Evolution', 'Molecular Biology'],
        'Computer Science': ['Data Structures', 'Algorithms', 'OOP Concepts', 'Databases', 'Networking'],
        English: ['Grammar Rules', 'Reading Comprehension', 'Essay Writing', 'Vocabulary', 'Literature Analysis'],
      };

      let subjectIdx = 0;
      for (let day = 0; day < daysCount; day++) {
        const date = format(addDays(new Date(), day), 'yyyy-MM-dd');
        for (let session = 0; session < sessionsPerDay; session++) {
          const sw = weightedSubjects[subjectIdx % weightedSubjects.length];
          subjectIdx++;

          const topics = sw.topics.length > 0 ? sw.topics : (defaultTopics[sw.subject] || ['General Review']);
          const topic = topics[(day + session) % topics.length];

          // More time for weak subjects
          const duration = sw.weight >= 3 ? 75 : sw.weight >= 2 ? 60 : 45;

          const isWeak = sw.weight >= 3;
          const title = isWeak
            ? `🎯 Focus: ${topic} (${sw.subject})`
            : `${topic} - ${sw.subject}`;

          plans.push({
            user_id: user!.id,
            title,
            subject: sw.subject,
            scheduled_date: date,
            duration_minutes: duration,
            topics: [topic],
            notes: isWeak
              ? `Priority: Your accuracy in ${sw.subject} needs improvement. Focus on understanding key concepts.`
              : undefined,
          });
        }
      }

      const { error } = await supabase.from('study_plans').insert(plans);
      if (error) throw error;

      const weakCount = weakness.weakSubjects.length;
      toast({
        title: '✨ Smart Study Plan Generated!',
        description: weakness.hasEnoughData
          ? `10-day plan created. ${weakCount > 0 ? `Extra focus on ${weakness.weakSubjects.map(s => s.subject).join(', ')}.` : 'Balanced across all subjects.'}`
          : '10-day balanced plan created. Take quizzes to get personalized plans!',
      });
      fetchPlans();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(selectedDate, { weekStartsOn: 1 }) });
  const dayPlans = plans.filter(p => isSameDay(new Date(p.scheduled_date), selectedDate));

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Study Plan</h1>
          <p className="text-muted-foreground">Organize your learning schedule</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShowWeakness(!showWeakness)}>
            <Brain className="h-4 w-4 mr-1" /> {showWeakness ? 'Hide' : 'My'} Strengths
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 mr-1" /> Add Plan
          </Button>
          <Button variant="hero" size="sm" onClick={generateAIPlan} disabled={generating}>
            <Sparkles className="h-4 w-4 mr-1" />
            {generating ? 'Generating...' : 'AI Smart Plan'}
          </Button>
        </div>
      </div>

      {/* Weakness report */}
      {showWeakness && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-display font-semibold mb-3 text-foreground flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Your Strength Map
          </h2>
          <WeaknessReport
            subjects={weakness.subjects}
            weakTopics={weakness.weakTopics}
            overallAccuracy={weakness.overallAccuracy}
            hasEnoughData={weakness.hasEnoughData}
          />
          {weakness.hasEnoughData && weakness.weakSubjects.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
              💡 <span className="font-medium text-foreground">Smart Tip:</span> Click "AI Smart Plan" to generate a study plan that focuses extra time on your weak areas.
            </div>
          )}
        </div>
      )}

      {/* Week Calendar */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`p-3 rounded-xl text-center transition-all ${
                  isSameDay(day, selectedDate)
                    ? 'gradient-primary text-primary-foreground shadow-glow'
                    : isToday(day)
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <p className="text-xs font-medium">{format(day, 'EEE')}</p>
                <p className="text-lg font-display font-bold">{format(day, 'd')}</p>
                <div className="flex justify-center gap-0.5 mt-1">
                  {plans.filter(p => isSameDay(new Date(p.scheduled_date), day)).slice(0, 3).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add form */}
      {showForm && (
        <Card className="border-0 shadow-md animate-fade-in">
          <CardHeader><CardTitle className="font-display text-lg">New Study Plan</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Algebra Practice" />
              </div>
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={formData.subject} onValueChange={v => setFormData(f => ({ ...f, subject: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" value={formData.duration} onChange={e => setFormData(f => ({ ...f, duration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="hero" onClick={createPlan}>Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day plans */}
      <div>
        <h2 className="text-lg font-display font-semibold mb-3 text-foreground">
          {isToday(selectedDate) ? "Today's Plans" : format(selectedDate, 'EEEE, MMM d')}
        </h2>
        {dayPlans.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No plans for this day</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dayPlans.map(plan => {
              const isWeakFocus = plan.title?.startsWith('🎯');
              return (
                <Card key={plan.id} className={`border-0 shadow-md ${isWeakFocus ? 'ring-2 ring-warning/30' : ''}`}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <button
                      onClick={() => toggleStatus(plan)}
                      className={`rounded-full p-2 transition-colors ${
                        plan.status === 'completed' ? 'bg-success text-success-foreground' :
                        plan.status === 'in_progress' ? 'bg-info text-info-foreground' :
                        'bg-muted text-muted-foreground hover:bg-primary/10'
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <div className="flex-1">
                      <p className={`font-medium ${plan.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {plan.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">{plan.subject}</span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {plan.duration_minutes} min
                        </span>
                        {isWeakFocus && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning font-medium">Priority</span>
                        )}
                      </div>
                      {plan.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{plan.notes}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deletePlan(plan.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyPlanPage;
