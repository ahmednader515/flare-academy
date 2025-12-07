"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SecureDocumentViewer } from "@/components/secure-document-viewer";
import { FileText, Trash2, Eye, Bookmark, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/lib/contexts/language-context";
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
} from "@/components/ui/alert-dialog";

interface SavedDocument {
  id: string;
  attachmentId: string;
  courseId: string;
  chapterId: string;
  attachmentName: string;
  attachmentUrl: string;
  createdAt: string;
}

export default function SavedDocumentsPage() {
  const { t } = useLanguage();
  const [documents, setDocuments] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<SavedDocument | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fetch documents from API
  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/saved-documents");
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error("Failed to fetch saved documents");
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchDocuments();
    toast.success(t('common.refreshed'));
  };

  const handleDelete = async (documentId: string) => {
    setIsDeleting(documentId);

    try {
      const response = await fetch(`/api/saved-documents/${documentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      // Update local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
      toast.success(t('student.documentUnsaved'));
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error(t('common.error'));
    } finally {
      setIsDeleting(null);
    }
  };

  const getFileIcon = (fileName: string) => {
    const isPDF = fileName.toLowerCase().endsWith('.pdf');
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName);

    if (isPDF) return "📄";
    if (isImage) return "🖼️";
    return "📎";
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bookmark className="h-6 w-6" />
            {t('student.savedDocuments')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('student.savedDocumentsDescription')}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Documents Grid */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bookmark className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">{t('student.noSavedDocuments')}</h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t('student.noSavedDocumentsDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <Card key={document.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-3xl flex-shrink-0">
                      {getFileIcon(document.attachmentName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2">
                        {document.attachmentName}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {new Date(document.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => setSelectedDocument(document)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {t('student.view')}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isDeleting === document.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t('student.unsaveDocument')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('student.unsaveDocumentConfirmation')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(document.id)}
                          className="bg-destructive hover:bg-destructive/90"
                        >
                          {t('common.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Secure Document Viewer Modal */}
      {selectedDocument && (
        <SecureDocumentViewer
          documentUrl={selectedDocument.attachmentUrl}
          documentName={selectedDocument.attachmentName}
          onClose={() => setSelectedDocument(null)}
        />
      )}
    </div>
  );
}
