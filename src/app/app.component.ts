import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { HeaderComponent } from './shared/components/header/header.component';
import { BottomNavComponent } from './shared/components/bottom-nav/bottom-nav.component';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterModule, SidebarComponent, HeaderComponent, BottomNavComponent],
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
    title = 'School Management System';
    isAuthenticated = false;

    constructor(
        private authService: AuthService,
        private themeService: ThemeService
    ) { }

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            this.isAuthenticated = !!user;
        });
    }
}
