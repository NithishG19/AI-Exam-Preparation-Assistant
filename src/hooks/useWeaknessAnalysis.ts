import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface SubjectStrength {
  subject: string;
  accuracy: number;
  totalQuestions: number;
  totalCorrect: number;
  quizCount: number;
  level: 'critical' | 'weak' | 'average' | 'strong' | 'excellent';
  topicBreakdown: TopicStrength[];
}

export interface TopicStrength {
  topic: string;
  subject: string;
  accuracy: number;
  questionCount: number;
  level: 'critical' | 'weak' | 'average' | 'strong' | 'excellent';
}

export interface WeaknessReport {
  subjects: SubjectStrength[];
  weakSubjects: SubjectStrength[];
  strongSubjects: SubjectStrength[];
  criticalTopics: TopicStrength[];
  weakTopics: TopicStrength[];
  overallAccuracy: number;
  hasEnoughData: boolean;
  loading: boolean;
}

function getLevel(accuracy: number): 'critical' | 'weak' | 'average' | 'strong' | 'excellent' {
  if (accuracy < 40) return 'critical';
  if (accuracy < 60) return 'weak';
  if (accuracy < 75) return 'average';
  if (accuracy < 90) return 'strong';
  return 'excellent';
}

export function useWeaknessAnalysis(): WeaknessReport {
  const { user } = useAuth();
  const [report, setReport] = useState<WeaknessReport>({
    subjects: [],
    weakSubjects: [],
    strongSubjects: [],
    criticalTopics: [],
    weakTopics: [],
    overallAccuracy: 0,
    hasEnoughData: false,
    loading: true,
  });

  useEffect(() => {
    if (!user) return;

    const analyze = async () => {
      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!attempts || attempts.length === 0) {
        setReport(r => ({ ...r, loading: false }));
        return;
      }

      // Per-subject aggregation
      const subjectMap: Record<string, { correct: number; total: number; count: number }> = {};
      attempts.forEach(a => {
        const subj = a.subject || 'Mixed';
        if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0, count: 0 };
        subjectMap[subj].correct += a.score;
        subjectMap[subj].total += a.total_questions;
        subjectMap[subj].count += 1;
      });

      // Per-topic aggregation from answers JSON
      // answers stored as [{questionId, selected, correct}]
      // We also need question topics — fetch questions used
      const questionIds: string[] = [];
      attempts.forEach(a => {
        if (Array.isArray(a.answers)) {
          a.answers.forEach((ans: any) => {
            if (ans.questionId) questionIds.push(ans.questionId);
          });
        }
      });

      let questionTopicMap: Record<string, { topic: string; subject: string }> = {};
      if (questionIds.length > 0) {
        const uniqueIds = [...new Set(questionIds)].slice(0, 500);
        const { data: questions } = await supabase
          .from('quiz_questions')
          .select('id, topic, subject')
          .in('id', uniqueIds);
        if (questions) {
          questions.forEach(q => {
            questionTopicMap[q.id] = { topic: q.topic || 'General', subject: q.subject };
          });
        }
      }

      // Build topic map
      const topicMap: Record<string, { correct: number; total: number; subject: string }> = {};
      attempts.forEach(a => {
        if (Array.isArray(a.answers)) {
          a.answers.forEach((ans: any) => {
            if (!ans.questionId) return;
            const qInfo = questionTopicMap[ans.questionId];
            if (!qInfo) return;
            const key = `${qInfo.subject}::${qInfo.topic}`;
            if (!topicMap[key]) topicMap[key] = { correct: 0, total: 0, subject: qInfo.subject };
            topicMap[key].total += 1;
            if (ans.correct) topicMap[key].correct += 1;
          });
        }
      });

      // Also add subject-level topic breakdown from the attempt subject tag
      const topicBreakdownBySubject: Record<string, TopicStrength[]> = {};
      Object.entries(topicMap).forEach(([key, val]) => {
        const [subject, topic] = key.split('::');
        if (val.total < 2) return; // need at least 2 questions for meaningful data
        const accuracy = Math.round((val.correct / val.total) * 100);
        const ts: TopicStrength = { topic, subject, accuracy, questionCount: val.total, level: getLevel(accuracy) };
        if (!topicBreakdownBySubject[subject]) topicBreakdownBySubject[subject] = [];
        topicBreakdownBySubject[subject].push(ts);
      });

      const subjects: SubjectStrength[] = Object.entries(subjectMap).map(([subject, { correct, total, count }]) => {
        const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
        return {
          subject,
          accuracy,
          totalCorrect: correct,
          totalQuestions: total,
          quizCount: count,
          level: getLevel(accuracy),
          topicBreakdown: (topicBreakdownBySubject[subject] || []).sort((a, b) => a.accuracy - b.accuracy),
        };
      }).sort((a, b) => a.accuracy - b.accuracy);

      const allTopics: TopicStrength[] = Object.entries(topicMap)
        .filter(([, v]) => v.total >= 2)
        .map(([key, v]) => {
          const [subject, topic] = key.split('::');
          const accuracy = Math.round((v.correct / v.total) * 100);
          return { topic, subject, accuracy, questionCount: v.total, level: getLevel(accuracy) };
        })
        .sort((a, b) => a.accuracy - b.accuracy);

      const totalCorrect = attempts.reduce((s, a) => s + a.score, 0);
      const totalQ = attempts.reduce((s, a) => s + a.total_questions, 0);
      const overallAccuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

      setReport({
        subjects,
        weakSubjects: subjects.filter(s => s.level === 'critical' || s.level === 'weak'),
        strongSubjects: subjects.filter(s => s.level === 'strong' || s.level === 'excellent'),
        criticalTopics: allTopics.filter(t => t.level === 'critical'),
        weakTopics: allTopics.filter(t => t.level === 'critical' || t.level === 'weak').slice(0, 10),
        overallAccuracy,
        hasEnoughData: attempts.length >= 2,
        loading: false,
      });
    };

    analyze();
  }, [user]);

  return report;
}
