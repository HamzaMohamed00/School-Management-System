import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { Video } from '../../../core/models/video.model';
import { VideoService } from '../../../core/services/video.service';
import { SubjectService } from '../../../core/services/subject.service';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.css']
})
export class VideosComponent implements OnInit {
  showModal = false;
  showWatchModal = false;
  isEditMode = false;
  loading = false;
  videos: Video[] = [];
  subjects: any[] = [];
  selectedVideoUrl: any = null;

  newVideo: any = {
    id: null,
    url: '',
    title: '',
    description: '',
    subjectId: null,
    thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400&h=250',
    duration: '10:00'
  };

  constructor(
    private videoService: VideoService,
    private subjectService: SubjectService,
    private api: ApiService,
    private sanitizer: DomSanitizer,
    private auth: AuthService
  ) { }

  async ngOnInit() {
    await Promise.all([
      this.loadVideos(),
      this.loadSubjects()
    ]);
  }

  async loadSubjects() {
    try {
      const user = this.auth.getCurrentUser();
      if (user?.role === 'Teacher') {
        this.subjects = await this.subjectService.getTeacherSubjects();
      } else {
        this.subjects = await this.subjectService.getAll();
      }
    } catch (err) {
      console.error('Failed to load subjects', err);
    }
  }

  async loadVideos() {
    this.loading = true;
    try {
      this.videos = await this.videoService.getVideos();
    } catch (err) {
      console.error('Failed to load videos', err);
      this.videos = [];
    } finally {
      this.loading = false;
    }
  }

  openModal() {
    this.isEditMode = false;
    this.newVideo = { id: null, url: '', title: '', description: '', subjectId: null, thumbnailUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=400&h=250', duration: '10:00' };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  getYouTubeId(url: string): string | null {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  onUrlChange() {
    const videoId = this.getYouTubeId(this.newVideo.url);
    if (videoId) {
      this.newVideo.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      // High-res might not exist for all videos, so we use hqdefault for better compatibility
    }
  }

  async publishVideo() {
    if (!this.newVideo.url || !this.newVideo.title || !this.newVideo.subjectId) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      const payload = { ...this.newVideo };
      if (!this.isEditMode) {
        delete payload.id; // Avoid sending 'id: null' for new records
      }

      if (this.isEditMode && payload.id) {
        await this.videoService.updateVideo(payload.id, payload);
      } else {
        await this.videoService.addVideo(payload);
      }
      await this.loadVideos();
      this.closeModal();
    } catch (err) {
      console.error('Failed to publish video', err);
      // Let the user know the server rejected the data
      alert('حدث خطأ أثناء نشر الفيديو. يرجى التأكد من ملء جميع الحقول بشكل صحيح.');
    }
  }

  editVideo(video: any) {
    this.isEditMode = true;
    this.newVideo = { 
      id: video.id,
      url: video.url,
      title: video.title,
      description: video.description,
      subjectId: this.subjects.find(s => s.name === video.subject)?.id || null,
      thumbnailUrl: video.thumbnail,
      duration: video.duration
    };
    this.showModal = true;
  }

  async deleteVideo(video: Video) {
    if (!confirm('هل أنت متأكد من حذف هذا الفيديو؟')) return;
    try {
      await this.api.delete(`/api/Videos/${video.id}`);
      this.videos = this.videos.filter(v => v.id !== video.id);
    } catch (err) {
      console.error('Failed to delete video', err);
    }
  }

  watchVideo(video: any) {
    if (!video.url) return;
    
    // Improved logic to extract YouTube ID
    const videoId = this.getYouTubeId(video.url);
    
    let embedUrl = '';
    if (videoId) {
      embedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else {
      embedUrl = video.url;
    }

    this.selectedVideoUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    this.showWatchModal = true;
  }

  closeWatchModal() {
    this.showWatchModal = false;
    this.selectedVideoUrl = null;
  }
}
