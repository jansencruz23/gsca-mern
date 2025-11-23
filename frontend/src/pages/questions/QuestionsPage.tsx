import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
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
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
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
      setNewQuestion({ text: "", category: "General" });
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (question: Question) => {
    setEditingQuestion({ ...question });
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-purple-50">
        <div className="text-center">
          <div className="relative inline-block">
            <div className="w-16 h-16 rounded-full bg-purple-100"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
          </div>
          <p className="mt-4 text-lg font-medium text-purple-700">
            Loading questions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#8434d0]">
            Question Bank
          </h1>
          <Button
            onClick={() => setShowAddDialog(true)}
            disabled={isSubmitting}
            size="lg"
            className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 rounded-2xl">
            <AlertDescription className="text-[#1e2939]">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {questions.length === 0 ? (
          <Card className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <MessageSquare className="h-16 w-16 text-[#8434d0] mb-6" />
              <h3 className="text-xl font-bold text-gray-800 mb-3">
                No questions yet
              </h3>
              <p className="text-gray-600 mb-6 text-center max-w-md">
                Get started by adding questions to your bank. You can use these
                during counseling sessions to track responses.
              </p>
              <Button
                onClick={() => setShowAddDialog(true)}
                disabled={isSubmitting}
                size="lg"
                className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Question
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((question) => (
              <Card
                key={question._id}
                className="rounded-2xl shadow-lg border-0 bg-white overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col"
              >
                <CardHeader className="pb-1 flex-grow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 pr-2">
                      <Badge className="mb-3 rounded-full px-3 py-1 text-sm bg-[#f0e6ff] text-[#8434d0] border border-[#d9c2f5]">
                        {question.category}
                      </Badge>
                      <CardTitle className="text-xl font-bold text-gray-800 leading-relaxed">
                        {question.text}
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(question)}
                      disabled={isSubmitting}
                      className="rounded-full text-[#8434d0] hover:bg-[#f0e6ff] hover:text-[#6b2bb8] h-10 w-10"
                      aria-label="Edit Question"
                    >
                      <Edit className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 mt-auto">
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <p className="text-sm text-gray-500">
                      Created on{" "}
                      {new Date(question.createdAt).toLocaleDateString()}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteQuestion(question._id)}
                      disabled={isSubmitting}
                      className="rounded-full text-red-500 hover:bg-red-50 hover:text-red-600 h-10 w-10"
                      aria-label="Delete Question"
                    >
                      {isSubmitting ? (
                        <div className="relative inline-block w-5 h-5">
                          <div className="w-5 h-5 rounded-full bg-purple-100"></div>
                          <div className="absolute top-0 left-0 w-5 h-5 rounded-full border-2 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                        </div>
                      ) : (
                        <Trash2 className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add Question Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Add New Question
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Add a new question to your question bank for use in counseling
                sessions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="text"
                  className="text-sm font-medium text-[#1e2939]"
                >
                  Question
                </Label>
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
                  className="rounded-2xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-sm font-medium text-[#1e2939]"
                >
                  Category
                </Label>
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
                  className="rounded-2xl h-11"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddDialog(false)}
                disabled={isSubmitting}
                className="rounded-full h-11 px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddQuestion}
                disabled={isSubmitting}
                className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white h-11 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <div className="relative inline-block w-5 h-5 mr-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100"></div>
                      <div className="absolute top-0 left-0 w-5 h-5 rounded-full border-2 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                    </div>
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
          <DialogContent className="rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Edit Question
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Update question details.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label
                  htmlFor="edit-text"
                  className="text-sm font-medium text-[#1e2939]"
                >
                  Question
                </Label>
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
                  className="rounded-2xl h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="edit-category"
                  className="text-sm font-medium text-[#1e2939]"
                >
                  Category
                </Label>
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
                  className="rounded-2xl h-11"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setEditingQuestion(null)}
                disabled={isSubmitting}
                className="rounded-full h-11 px-6"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditQuestion}
                disabled={isSubmitting}
                className="rounded-full bg-[#8434d0] hover:bg-[#6b2bb8] text-white h-11 px-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {isSubmitting ? (
                  <>
                    <div className="relative inline-block w-5 h-5 mr-2">
                      <div className="w-5 h-5 rounded-full bg-purple-100"></div>
                      <div className="absolute top-0 left-0 w-5 h-5 rounded-full border-2 border-transparent border-t-purple-600 border-r-purple-600 animate-spin"></div>
                    </div>
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
    </div>
  );
};
