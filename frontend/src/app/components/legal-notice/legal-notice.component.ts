import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-legal-notice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="legal-notice" *ngIf="!dismissed">
      <div class="notice-content">
        <div class="notice-icon">⚠️</div>
        <div class="notice-text">
          <h3>Legal Notice</h3>
          <p>
            This tool is provided for downloading videos <strong>you own or have permission to download</strong>.
            You are solely responsible for ensuring you have legal rights to download content.
          </p>
          <p class="disclaimer-small">
            By using this service, you agree to our Terms of Service and acknowledge responsibility
            for complying with YouTube's TOS and applicable copyright laws.
          </p>
        </div>
        <button class="accept-btn" (click)="acceptNotice()">
          I Understand
        </button>
      </div>
    </div>
  `,
  styles: [`
    .legal-notice {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, rgba(255, 0, 85, 0.95), rgba(191, 0, 255, 0.95));
      padding: 20px;
      z-index: 9999;
      box-shadow: 0 -5px 30px rgba(255, 0, 85, 0.5);
      animation: slideUp 0.5s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(100%);
      }
      to {
        transform: translateY(0);
      }
    }

    .notice-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 20px;
      color: white;
    }

    .notice-icon {
      font-size: 48px;
      flex-shrink: 0;
    }

    .notice-text {
      flex: 1;
    }

    .notice-text h3 {
      margin: 0 0 10px 0;
      font-size: 20px;
      font-weight: bold;
    }

    .notice-text p {
      margin: 5px 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .disclaimer-small {
      font-size: 12px !important;
      opacity: 0.9;
    }

    .accept-btn {
      padding: 12px 30px;
      background: white;
      color: #bf00ff;
      border: none;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .accept-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 20px rgba(255, 255, 255, 0.3);
    }

    @media (max-width: 768px) {
      .notice-content {
        flex-direction: column;
        text-align: center;
      }

      .notice-icon {
        font-size: 36px;
      }

      .notice-text h3 {
        font-size: 18px;
      }

      .notice-text p {
        font-size: 13px;
      }

      .accept-btn {
        width: 100%;
      }
    }
  `]
})
export class LegalNoticeComponent {
  dismissed = false;

  constructor() {
    // Check if user has already accepted
    const hasAccepted = localStorage.getItem('legal-notice-accepted');
    if (hasAccepted === 'true') {
      this.dismissed = true;
    }
  }

  acceptNotice() {
    localStorage.setItem('legal-notice-accepted', 'true');
    this.dismissed = true;
  }
}
