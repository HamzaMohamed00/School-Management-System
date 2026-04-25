import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../../core/services/chat.service';
import { Message, Contact } from '../../../core/models/message.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.css']
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  contacts: Contact[] = [];
  filteredContacts: Contact[] = [];
  selectedContact: Contact | null = null;
  messages: Message[] = [];
  newMessage = '';
  searchQuery = '';
  loading = false;
  loadingMessages = false;
  currentUserRole = '';
  currentUserId = '';
  private messageSub?: Subscription;

  // UI Confirmation & Feedback
  showClearConfirm = false;
  showDeleteConfirm = false;
  uiFeedbackMessage = '';
  uiFeedbackType: 'success' | 'error' = 'success';

  constructor(
    private api: ApiService,
    private signalR: SignalRService,
    private auth: AuthService,
    private chatService: ChatService,
    private route: ActivatedRoute
  ) { }

  async ngOnInit() {
    console.log('ChatRoomComponent: ngOnInit started');
    const user = this.auth.getCurrentUser();
    this.currentUserRole = user?.role || '';
    this.currentUserId = user?.id?.toString() || '';

    this.loading = true;
    await this.loadContacts();
    
    // Check for userId in route
    this.route.params.subscribe(async params => {
      const targetUserId = params['userId'];
      if (targetUserId) {
        await this.handleDirectChat(targetUserId);
      }
    });

    this.loading = false;

    await this.signalR.startConnection();
    this.listenForMessages();
  }

  async handleDirectChat(userId: string) {
    // Check if contact already exists
    let contact = this.contacts.find(c => c.id === userId);
    
    if (!contact) {
      // Fetch user info from backend
      try {
        const userInfo = await this.chatService.getUserInfo(userId);
        contact = userInfo;
        this.contacts.unshift(contact);
        this.filterContacts();
      } catch (err) {
        console.error('Failed to get user info for direct chat', err);
        return;
      }
    }
    
    if (contact) {
      this.selectContact(contact);
    }
  }

  async loadContacts(): Promise<void> {
    try {
      this.contacts = await this.chatService.getContacts() || [];
      this.filteredContacts = [...this.contacts];
    } catch {
      this.contacts = [];
      this.filteredContacts = [];
    }
  }

  filterContacts() {
    if (!this.searchQuery.trim()) {
      this.filteredContacts = [...this.contacts];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredContacts = this.contacts.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.studentName?.toLowerCase().includes(q)
      );
    }
  }

  async selectContact(contact: Contact): Promise<void> {
    this.selectedContact = contact;
    this.messages = [];
    this.loadingMessages = true;
    await this.loadMessages(contact.id);
    this.loadingMessages = false;
    this.scrollToBottom();
  }

  async loadMessages(contactId: string): Promise<void> {
    try {
      const raw: any[] = await this.chatService.getMessages(contactId, 1, 100);
      this.messages = raw.map(m => {
        const sId = m.senderId || (m as any).SenderId;
        const cId = m.receiverId || (m as any).ReceiverId;
        const content = m.content || (m as any).Content;
        const time = m.sentAt || (m as any).SentAt || m.timestamp || new Date();
        
        return {
          ...m,
          content: content,
          senderId: sId,
          receiverId: cId,
          timestamp: time,
          isIncoming: String(sId) !== String(this.currentUserId)
        };
      });
    } catch (err) {
      console.error('Failed to load chat history:', err);
      this.messages = [];
    }
  }

  listenForMessages(): void {
    this.messageSub = this.signalR.message$.subscribe(message => {
      if (!message) return;
      
      const otherPersonId = message.senderId === this.currentUserId ? message.receiverId : message.senderId;
      
      // Prevent self-chat processing
      if (otherPersonId === this.currentUserId) return;

      if (this.selectedContact && otherPersonId === this.selectedContact.id) {
        const msgContent = message.content || (message as any).Content;
        const msgTime = message.timestamp || (message as any).Timestamp || message.sentAt || (message as any).SentAt || new Date();
        const msgSenderId = message.senderId || (message as any).SenderId;

        const exists = this.messages.some(m =>
          m.content === msgContent &&
          Math.abs(new Date(m.timestamp).getTime() - new Date(msgTime).getTime()) < 2000
        );
        if (!exists) {
          const processedMsg = {
            ...message,
            content: msgContent,
            senderId: msgSenderId,
            timestamp: msgTime,
            isIncoming: String(msgSenderId) !== String(this.currentUserId)
          };
          this.messages.push(processedMsg);
          this.scrollToBottom();
        }
      }
      // Update contact list unread count
      this.updateContactPreview(message);
    });
  }

  private updateContactPreview(msg: Message) {
    const sId = String(msg.senderId || (msg as any).SenderId).toLowerCase();
    const rId = String(msg.receiverId || (msg as any).ReceiverId).toLowerCase();
    const myId = String(this.currentUserId).toLowerCase();
    
    const contactId = sId === myId ? rId : sId;
    const contact = this.contacts.find(c => String(c.id).toLowerCase() === contactId);
    
    if (contact) {
      contact.lastMessage = msg.content || (msg as any).Content;
      contact.lastMessageTime = msg.timestamp || (msg as any).SentAt || (msg as any).Timestamp || new Date();
      
      const isIncoming = sId !== myId;
      const isCurrentlySelected = this.selectedContact && String(this.selectedContact.id).toLowerCase() === contactId;
      
      if (isIncoming && !isCurrentlySelected) {
        contact.unreadCount = (contact.unreadCount || 0) + 1;
      }
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim() || !this.selectedContact) return;

    const msgContent = this.newMessage;
    this.newMessage = '';

    // Optimistic add
    const optimisticMsg: Message = {
      id: Date.now().toString(),
      senderId: this.currentUserId,
      receiverId: this.selectedContact.id,
      content: msgContent,
      timestamp: new Date(),
      isIncoming: false
    };
    this.messages.push(optimisticMsg);
    this.scrollToBottom();

    try {
      await this.chatService.sendMessage(this.selectedContact.id, msgContent);
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  }

  onTyping(): void {
    if (!this.selectedContact) return;
    try {
      this.signalR.typing(this.selectedContact.id);
    } catch { }
  }

  getContactRoleLabel(contact: Contact): string {
    if (contact.role === 'Teacher') return 'معلم';
    if (contact.role === 'Student') return 'طالب';
    if (contact.role === 'Parent') return 'ولي أمر';
    return '';
  }

  getSearchPlaceholder(): string {
    if (this.currentUserRole === 'Student') return 'بحث عن مدرس...';
    if (this.currentUserRole === 'Parent') return 'بحث عن مدرس...';
    if (this.currentUserRole === 'Teacher') return 'بحث عن طالب أو ولي أمر...';
    return 'بحث...';
  }

  showFeedback(message: string, type: 'success' | 'error' = 'success') {
    this.uiFeedbackMessage = message;
    this.uiFeedbackType = type;
    setTimeout(() => this.uiFeedbackMessage = '', 3000);
  }

  confirmClear() {
    this.showClearConfirm = true;
  }

  confirmDelete() {
    this.showDeleteConfirm = true;
  }

  async clearChat(): Promise<void> {
    console.log('Action: clearChat execution started');
    if (!this.selectedContact) return;
    
    try {
      await this.chatService.clearChatHistory(this.selectedContact.id);
      this.messages = [];
      this.showFeedback('تم مسح محتوى المحادثة بنجاح');
      this.showClearConfirm = false;
    } catch (err) {
      console.error('clearChat: API error', err);
      this.showFeedback('حدث خطأ أثناء مسح المحادثة', 'error');
    }
  }

  async deleteContact(): Promise<void> {
    console.log('Action: deleteContact execution started');
    if (!this.selectedContact) return;
    
    try {
      await this.chatService.removeContact(this.selectedContact.id);
      this.contacts = this.contacts.filter(c => c.id !== this.selectedContact?.id);
      this.filterContacts();
      const name = this.selectedContact.name;
      this.selectedContact = null;
      this.showFeedback(`تم مسح ${name} من قائمة جهات الاتصال`);
      this.showDeleteConfirm = false;
    } catch (err) {
      console.error('deleteContact: API error', err);
      this.showFeedback('حدث خطأ أثناء مسح الشخص', 'error');
    }
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 100);
  }

  ngOnDestroy(): void {
    this.messageSub?.unsubscribe();
  }
}