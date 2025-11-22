import React, { useState, useEffect, use } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { questionsAPI } from '../../services/api';
import type { Question } from '../../types/question';
import { MessageSquare, Plus, Trash2, Edit } from 'lucide-react';

export const QuestionsPage: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newQuestion, setNewQuestion] = useState({ text: '', category: 'General' });
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await questionsAPI.getAll();
                setQuestions(response.data);
            } catch (error) {
                console.error("Error fetching questions:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchQuestions();
    }, []);

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        try {

        }
    };

    return <></>
}