import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ConversationList({ conversations, activeConversationId, onSelectConversation, onNewConversation, onRename, onDelete }) {
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedConv, setSelectedConv] = useState(null);
  const [newTitle, setNewTitle] = useState("");

  const handleRenameClick = (conv) => {
    setSelectedConv(conv);
    setNewTitle(conv.title);
    setRenameModalOpen(true);
  };
  
  const handleDeleteClick = (conv) => {
    setSelectedConv(conv);
    setDeleteModalOpen(true);
  };
  
  const confirmRename = () => {
    if (selectedConv && newTitle) {
      onRename(selectedConv.id, newTitle);
    }
    setRenameModalOpen(false);
    setSelectedConv(null);
  };
  
  const confirmDelete = () => {
    if (selectedConv) {
      onDelete(selectedConv.id);
    }
    setDeleteModalOpen(false);
    setSelectedConv(null);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex-row items-center justify-between p-4 border-b">
          <CardTitle className="text-lg">Chats</CardTitle>
          <Button size="sm" onClick={onNewConversation} className="gap-1">
            <Plus className="w-4 h-4" />
            New
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div key={conv.id} className="group relative">
                <Button
                  variant={activeConversationId === conv.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto p-3 text-left"
                  onClick={() => onSelectConversation(conv.id)}
                >
                  <div className="flex-1 overflow-hidden">
                    <div className="font-medium text-sm truncate">{conv.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                    </div>
                  </div>
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100">
                           <MoreHorizontal className="w-4 h-4"/>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onSelect={() => handleRenameClick(conv)}>
                            <Edit className="w-4 h-4 mr-2"/> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteClick(conv)} className="text-red-500">
                            <Trash2 className="w-4 h-4 mr-2"/> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Rename Modal */}
      <Dialog open={renameModalOpen} onOpenChange={setRenameModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="conv-title">New Title</Label>
            <Input id="conv-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameModalOpen(false)}>Cancel</Button>
            <Button onClick={confirmRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
          </DialogHeader>
          <p>This will permanently delete the conversation "{selectedConv?.title}". This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}