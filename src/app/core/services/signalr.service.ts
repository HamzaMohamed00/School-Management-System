import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Message } from '../models/message.model';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection!: signalR.HubConnection;
  private messageSubject = new Subject<Message>();
  message$ = this.messageSubject.asObservable();

  private notificationSubject = new Subject<any>();
  notification$ = this.notificationSubject.asObservable();

  constructor(private auth: AuthService) { }

  async startConnection(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.signalRUrl}`, {
        accessTokenFactory: () => this.auth.getToken() || ''
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerEvents();

    try {
      await this.hubConnection.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('SignalR connection error:', err);
    }
  }

  private registerEvents(): void {
    this.hubConnection.on('ReceiveMessage', (senderId: string, message: string) => {
      const msg: Message = {
        id: Date.now().toString(),
        senderId,
        receiverId: this.auth.getCurrentUser()?.id?.toString() || '',
        content: message,
        timestamp: new Date(),
        isRead: false,
        isIncoming: true
      };
      this.messageSubject.next(msg);
      // For global notification badge
      this.notificationSubject.next({ type: 'message', data: msg });
    });

    this.hubConnection.on('ReceiveNotification', (notification: any) => {
      this.notificationSubject.next({ type: 'general', data: notification });
    });

    this.hubConnection.on('UserTyping', (userId: string) => { { } });
  }

  async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
    }
  }

  async sendMessage(receiverId: string, content: string): Promise<void> {
    await this.hubConnection.invoke('SendMessage', receiverId, content);
  }

  async typing(receiverId: string): Promise<void> {
    try {
      await this.hubConnection.invoke('Typing', receiverId);
    } catch { }
  }
}