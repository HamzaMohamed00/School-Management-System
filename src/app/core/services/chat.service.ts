import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Message, Contact } from '../models/message.model';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private hubConnection: signalR.HubConnection | null = null;
  private messageSubject = new BehaviorSubject<Message | null>(null);
  public message$ = this.messageSubject.asObservable();

  constructor(private api: ApiService, private authService: AuthService) {
    this.initSignalR();
  }

  private async initSignalR() {
    const token = this.authService.getToken();
    if (!token) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(environment.signalRUrl, {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.hubConnection.on('ReceiveMessage', (senderId: string, content: string) => {
      const msg: Message = {
        id: Date.now().toString(),
        senderId,
        receiverId: this.authService.getCurrentUser()?.id?.toString() || '',
        content,
        timestamp: new Date(),
        isIncoming: true
      };
      this.messageSubject.next(msg);
    });

    try {
      await this.hubConnection.start();
      console.log('SignalR Chat Connected');
    } catch (err) {
      console.error('SignalR connection error: ', err);
    }
  }

  async getContacts(): Promise<Contact[]> {
    return this.api.get<Contact[]>('/api/Chat/contacts');
  }

  async getMessages(userId: string, page: number = 1, size: number = 30): Promise<Message[]> {
    return this.api.get<Message[]>(`/api/Chat/history/${userId}`, { page, size });
  }

  async getUserInfo(userId: string): Promise<Contact> {
    return this.api.get<Contact>(`/api/Chat/user-info/${userId}`);
  }

  async sendMessage(receiverId: string, content: string): Promise<boolean> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('SendMessage', receiverId, content);
      return true;
    }
    // Fallback to REST if SignalR not connected
    await this.api.post<Message>('/api/Chat/send', { receiverId, content });
    return true;
  }

  async markAsRead(messageId: string): Promise<void> {
    return this.api.post(`/api/Chat/mark-read/${messageId}`, {});
  }

  async deleteMessage(messageId: string): Promise<void> {
    return this.api.delete(`/api/Chat/message/${messageId}`);
  }

  async clearChatHistory(userId: string): Promise<void> {
    return this.api.delete(`/api/Chat/history/${userId}`);
  }

  async removeContact(userId: string): Promise<void> {
    return this.api.delete(`/api/Chat/contact/${userId}`);
  }
}