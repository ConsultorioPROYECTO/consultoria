'use client';
import { Badge } from "@rutas/components/ui/badge";

export interface ChatProps {
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  variant?: 'default' | 'secondary';
}

export function Chats({ chats }: { chats: ChatProps[] }) {
  return (
    <div className="space-y-2">
      {chats.map((chat, index) => (
        <div key={index} className="flex justify-between items-center p-3 hover:bg-muted/50 rounded-lg transition-colors">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">{chat.name}</h4>
            <p className="text-sm text-muted-foreground line-clamp-1">{chat.lastMessage}</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">{chat.time}</span>
            <Badge variant={chat.variant || 'default'}>{chat.unread}</Badge>
          </div>
        </div>
      ))}
    </div>
  );
}