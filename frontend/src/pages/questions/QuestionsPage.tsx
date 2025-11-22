import React, { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "../../components/ui/dialog";
import { questionsAPI } from "../../services/api";
import { Alert, AlertDescription } from "../../components/ui/alert";
import type { Question } from "../../types/question";
import { MessageSquare, Plus, Trash2, Edit, Loader2 } from "lucide-react";

export const QuestionsPage: React.FC = () => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newQuestion, setNewQuestion] = useState({
        text: "",
        category: "General",
    });
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(
        null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    const handleAddQuestion = async () => {
        if (!newQuestion.text.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const response = await questionsAPI.create(newQuestion);
            setQuestions([...questions, response.data]);
            setShowAddDialog(false);
        } catch (error) {
            console.error("Error adding question:", error);
            setError("Failed to add question. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditQuestion = async () => {
        if (!editingQuestion || !editingQuestion.text.trim()) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await questionsAPI.update(editingQuestion._id, {
                text: editingQuestion.text,
                category: editingQuestion.category,
            });

            setQuestions(
                questions.map((q) =>
                    q._id === editingQuestion._id ? editingQuestion : q
                )
            );

            setEditingQuestion(null);
        } catch (error) {
            console.error("Error updating question:", error);
            setError("Failed to update question. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm("Are you sure you want to delete this question?")) return;

        setIsSubmitting(true);
        setError(null);

        try {
            await questionsAPI.delete(id);
            setQuestions(questions.filter((q) => q._id !== id));
        } catch (error) {
            console.error("Error deleting question:", error);
            setError("Failed to delete question. Please try again.");
        }
    };

    const openEditDialog = (question: Question) => {
        setEditingQuestion({ ...question });
        setError(null);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                Loading...
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Question Bank</h1>
                <Button
                    onClick={() => setShowAddDialog(true)}
                    disabled={isSubmitting}
                >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                </Button>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {questions.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium mb-2">
                            No questions yet
                        </h3>
                        <p className="text-gray-500 mb-4 text-center max-w-md">
                            Get started by adding questions to your bank. You
                            can use these during counseling sessions to track
                            responses.
                        </p>
                        <Button
                            onClick={() => setShowAddDialog(true)}
                            disabled={isSubmitting}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Your First Question
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {questions.map((question) => (
                        <Card key={question._id} className="relative">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <Badge
                                            variant="outline"
                                            className="mb-2"
                                        >
                                            {question.category}
                                        </Badge>
                                        <CardTitle className="text-lg">
                                            {question.text}
                                        </CardTitle>
                                    </div>
                                    <div className="flex space-x-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                openEditDialog(question)
                                            }
                                            disabled={isSubmitting}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                                handleDeleteQuestion(
                                                    question._id
                                                )
                                            }
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-500">
                                    Created on{" "}
                                    {new Date(
                                        question.createdAt
                                    ).toLocaleDateString()}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Add Question Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Question</DialogTitle>
                        <DialogDescription>
                            Add a new question to your question bank for use in
                            counseling sessions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="text">Question</Label>
                            <Input
                                id="text"
                                value={newQuestion.text}
                                onChange={(e) =>
                                    setNewQuestion({
                                        ...newQuestion,
                                        text: e.target.value,
                                    })
                                }
                                placeholder="Enter your question"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input
                                id="category"
                                value={newQuestion.category}
                                onChange={(e) =>
                                    setNewQuestion({
                                        ...newQuestion,
                                        category: e.target.value,
                                    })
                                }
                                placeholder="e.g., General, Family, Career"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowAddDialog(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddQuestion}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                "Add Question"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Question Dialog */}
            <Dialog
                open={!!editingQuestion}
                onOpenChange={() => setEditingQuestion(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Question</DialogTitle>
                        <DialogDescription>
                            Update question details.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-text">Question</Label>
                            <Input
                                id="edit-text"
                                value={editingQuestion?.text || ""}
                                onChange={(e) =>
                                    setEditingQuestion(
                                        editingQuestion
                                            ? {
                                                  ...editingQuestion,
                                                  text: e.target.value,
                                              }
                                            : null
                                    )
                                }
                                placeholder="Enter your question"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-category">Category</Label>
                            <Input
                                id="edit-category"
                                value={editingQuestion?.category || ""}
                                onChange={(e) =>
                                    setEditingQuestion(
                                        editingQuestion
                                            ? {
                                                  ...editingQuestion,
                                                  category: e.target.value,
                                              }
                                            : null
                                    )
                                }
                                placeholder="e.g., General, Family, Career"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingQuestion(null)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditQuestion}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Question"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};