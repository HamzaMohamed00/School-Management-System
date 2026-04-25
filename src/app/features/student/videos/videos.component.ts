import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VideoService } from '../../../core/services/video.service';
import { Video } from '../../../core/models/video.model';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-videos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './videos.component.html',
  styleUrls: ['./videos.component.css']
})
export class VideosComponent implements OnInit {
  videos: Video[] = [];
  filteredVideos: Video[] = [];
  loading = false;

  categories = ['الكل', 'الرياضيات', 'الفيزياء', 'اللغة العربية', 'اللغة الإنجليزية', 'العلوم'];
  activeCategory = 'الكل';
  showWatchModal = false;
  selectedVideoUrl: any = null;

  constructor(
    private videoService: VideoService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.loadVideos();
  }

  watchVideo(video: any) {
    if (!video.url) return;
    
    // Improved regex to extract YouTube ID
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = video.url.match(regExp);
    
    let embedUrl = '';
    if (match && match[2].length === 11) {
      embedUrl = `https://www.youtube.com/embed/${match[2]}`;
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

  async loadVideos() {
    this.loading = true;
    try {
      this.videos = await this.videoService.getVideos();
      this.filterVideos();
    } catch (err) {
      console.error(err);
      this.videos = [];
      this.filteredVideos = [];
    } finally {
      this.loading = false;
    }
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
    this.filterVideos();
  }

  filterVideos() {
    if (this.activeCategory === 'الكل') {
      this.filteredVideos = [...this.videos];
    } else {
      this.filteredVideos = this.videos.filter(v => v.subject === this.activeCategory);
    }
  }
}
