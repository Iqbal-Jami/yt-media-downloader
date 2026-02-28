import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Angular 21: View Transitions API
 * Smooth page transitions with native browser API
 */
@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="navigation">
      <button (click)="navigateTo('/home')" class="nav-button">
        🏠 Home
      </button>
      <button (click)="navigateTo('/history')" class="nav-button">
        📜 History
      </button>
      <button (click)="navigateTo('/settings')" class="nav-button">
        ⚙️ Settings
      </button>
    </nav>
  `,
  styles: [`
    .navigation {
      display: flex;
      gap: 10px;
      padding: 20px;
      background: rgba(26, 26, 46, 0.8);
      border-radius: 15px;
    }

    .nav-button {
      padding: 10px 20px;
      background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
      border: none;
      border-radius: 8px;
      color: white;
      cursor: pointer;
      font-size: 16px;
      transition: transform 0.2s;
      
      /* Angular 21: View Transition Names */
      view-transition-name: var(--transition-name);
    }

    .nav-button:hover {
      transform: scale(1.05);
    }
  `]
})
export class NavigationComponent {
  constructor(private router: Router) {}

  // Angular 21: View Transitions with Navigation
  navigateTo(path: string) {
    // Check if View Transitions API is supported
    if (this.supportsViewTransitions()) {
      // @ts-ignore - View Transitions API
      document.startViewTransition(() => {
        this.router.navigate([path]);
      });
    } else {
      // Fallback for browsers without support
      this.router.navigate([path]);
    }
  }

  private supportsViewTransitions(): boolean {
    // @ts-ignore
    return 'startViewTransition' in document;
  }
}


/**
 * Angular 21: Component with View Transitions
 * Add this to your CSS for smooth transitions
 */
@Component({
  selector: 'app-video-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="video-card" [style.view-transition-name]="'video-' + videoId()">
      <img [src]="thumbnail()" class="thumbnail" />
      <h3>{{ title() }}</h3>
      <button (click)="expand()" class="expand-btn">
        View Details
      </button>
    </div>
  `,
  styles: [`
    /* Angular 21: View Transition CSS */
    .video-card {
      border-radius: 12px;
      overflow: hidden;
      background: rgba(26, 26, 46, 0.8);
      padding: 15px;
      
      /* This creates smooth transitions when element changes */
      view-transition-name: var(--card-name);
    }

    .thumbnail {
      width: 100%;
      border-radius: 8px;
      
      /* Individual transition for image */
      view-transition-name: var(--thumb-name);
    }

    /* Define transition animations */
    ::view-transition-old(root),
    ::view-transition-new(root) {
      animation-duration: 0.3s;
    }

    ::view-transition-old(video-card) {
      animation: fade-out 0.3s ease-out;
    }

    ::view-transition-new(video-card) {
      animation: fade-in 0.3s ease-in;
    }

    @keyframes fade-out {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class VideoCardComponent {
  videoId = signal('default');
  thumbnail = signal('');
  title = signal('');

  expand() {
    // Angular 21: Programmatic View Transition
    if ('startViewTransition' in document) {
      // @ts-ignore
      document.startViewTransition(() => {
        // Make changes that should be animated
        this.expandCard();
      });
    } else {
      this.expandCard();
    }
  }

  private expandCard() {
    // Your expand logic here
    console.log('Card expanded');
  }
}


/**
 * Add this CSS to your global styles.scss for View Transitions
 */
export const VIEW_TRANSITIONS_CSS = `
/* ========================================
   ANGULAR 21: VIEW TRANSITIONS API
   ======================================== */

/* Enable view transitions globally */
@view-transition {
  navigation: auto;
}

/* Smooth page transitions */
::view-transition-old(root) {
  animation: fade-out 0.3s ease-out;
}

::view-transition-new(root) {
  animation: fade-in 0.3s ease-in;
}

/* Slide transition for route changes */
::view-transition-old(main) {
  animation: slide-out-left 0.3s ease-out;
}

::view-transition-new(main) {
  animation: slide-in-right 0.3s ease-in;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-out-left {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(-30px);
    opacity: 0;
  }
}

@keyframes slide-in-right {
  from {
    transform: translateX(30px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Zoom transition for cards */
::view-transition-old(card) {
  animation: zoom-out 0.3s ease-out;
}

::view-transition-new(card) {
  animation: zoom-in 0.3s ease-in;
}

@keyframes zoom-out {
  from {
    transform: scale(1);
    opacity: 1;
  }
  to {
    transform: scale(0.9);
    opacity: 0;
  }
}

@keyframes zoom-in {
  from {
    transform: scale(1.1);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Customize transition speed */
::view-transition-group(*) {
  animation-duration: 0.3s;
  animation-timing-function: ease-in-out;
}
`;
