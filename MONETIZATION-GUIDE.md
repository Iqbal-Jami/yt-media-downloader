# 💰 Monetization Implementation Guide

## Quick Summary

This guide shows you how to implement monetization strategies:
1. **Google AdSense** (Easiest - Start here)
2. **Premium Subscriptions** (Requires backend changes)
3. **Affiliate Marketing** (Content strategy)

---

## 1️⃣ GOOGLE ADSENSE INTEGRATION (Easiest)

### Expected Revenue
- **10,000 users/month:** $50-150/month
- **50,000 users/month:** $500-1500/month
- **100,000+ users/month:** $1000-3000/month

### Step-by-Step Setup

#### A. Create AdSense Account
1. Go to https://www.google.com/adsense
2. Sign up with Google account
3. Add your website
4. Wait for approval (1-7 days)

#### B. Implementation

**Add to `frontend/src/index.html` (in `<head>` section):**
```html
<!-- Google AdSense -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX"
     crossorigin="anonymous"></script>
```

**Create Ad Component:**
`frontend/src/app/components/ad-banner/ad-banner.component.ts`

```typescript
import { Component, AfterViewInit, Input } from '@angular/core';

@Component({
  selector: 'app-ad-banner',
  standalone: true,
  template: `
    <div class="ad-container" [class.responsive]="responsive">
      <ins class="adsbygoogle"
           [style.display]="display"
           [attr.data-ad-client]="adClient"
           [attr.data-ad-slot]="adSlot"
           [attr.data-ad-format]="adFormat || 'auto'"
           [attr.data-full-width-responsive]="responsive">
      </ins>
    </div>
  `,
  styles: [`
    .ad-container {
      margin: 20px auto;
      text-align: center;
      min-height: 90px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .ad-container.responsive {
      width: 100%;
    }

    .adsbygoogle {
      display: block;
    }
  `]
})
export class AdBannerComponent implements AfterViewInit {
  @Input() adSlot: string = '';
  @Input() adClient: string = 'ca-pub-XXXXXXXXXX'; // Your AdSense ID
  @Input() adFormat: string = 'auto';
  @Input() responsive: boolean = true;
  @Input() display: string = 'block';

  ngAfterViewInit() {
    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }
}
```

**Usage in your main component:**

```typescript
// In video-downloader.component.ts
import { AdBannerComponent } from '../ad-banner/ad-banner.component';

@Component({
  // ... other config
  imports: [CommonModule, FormsModule, AdBannerComponent],
})
export class VideoDownloaderComponent {
  // ... rest of code
}
```

**In template (video-downloader.component.html):**

```html
<!-- After header, before main content -->
<app-ad-banner 
  adSlot="1234567890"
  [responsive]="true">
</app-ad-banner>

<!-- Your main content -->
<div class="downloader">
  <!-- ... existing content ... -->
</div>

<!-- Another ad at bottom -->
<app-ad-banner 
  adSlot="0987654321"
  [responsive]="true">
</app-ad-banner>
```

#### C. Ad Placement Strategy (Best Practices)

**High Performing Locations:**
1. **Above the fold** - Header banner (728x90 or responsive)
2. **Between video info and download buttons** - Rectangle (300x250)
3. **Below download history** - Bottom banner (responsive)
4. **Sidebar** (if you add one) - Vertical (160x600)

**DON'T:**
- ❌ Place too many ads (max 3-4 per page)
- ❌ Make ads look like buttons
- ❌ Force clicks
- ❌ Hide download buttons behind ads

---

## 2️⃣ PREMIUM SUBSCRIPTION MODEL

### Pricing Strategy
- **Free:** 5 downloads/day, 720p max, with ads
- **Premium:** $4.99/month or $39.99/year
  - Unlimited downloads
  - 4K quality
  - No ads
  - Priority servers
  - Download history sync

### Implementation

#### A. Backend Changes

**Create Subscription Schema:**
`backend/src/subscription/subscription.entity.ts`

```typescript
export interface User {
  id: string;
  email: string;
  isPremium: boolean;
  subscriptionTier: 'free' | 'premium';
  subscriptionEndDate?: Date;
  dailyDownloadCount: number;
  lastDownloadReset: Date;
}

export interface DownloadQuota {
  free: number; // 5 per day
  premium: number; // unlimited (-1)
}

export const DOWNLOAD_QUOTAS: DownloadQuota = {
  free: 5,
  premium: -1 // unlimited
};
```

**Create Quota Middleware:**
`backend/src/middleware/quota.middleware.ts`

```typescript
import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class QuotaMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Check user's subscription status from database
    const user = req['user']; // From auth middleware
    
    if (!user) {
      // Anonymous users - use IP-based limiting
      const ip = req.ip;
      const downloads = this.getDownloadCount(ip);
      
      if (downloads >= 5) {
        throw new HttpException(
          'Daily download limit reached. Upgrade to Premium for unlimited downloads!',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    } else if (user.subscriptionTier === 'free') {
      if (user.dailyDownloadCount >= 5) {
        throw new HttpException(
          'Daily download limit reached. Upgrade to Premium!',
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }
    // Premium users pass through
    
    next();
  }

  private getDownloadCount(ip: string): number {
    // Implement Redis or in-memory cache
    // Reset daily at midnight
    return 0; // Placeholder
  }
}
```

#### B. Stripe Integration

**Install Stripe:**
```bash
cd backend
npm install stripe @nestjs/stripe
```

**Create Payment Module:**
`backend/src/payment/payment.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async createCheckoutSession(userId: string, plan: 'monthly' | 'yearly') {
    const prices = {
      monthly: 'price_XXXXXXXXXX', // From Stripe Dashboard
      yearly: 'price_YYYYYYYYYY'
    };

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: prices[plan],
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      client_reference_id: userId,
    });

    return session;
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed':
        // Activate user's premium subscription
        await this.activatePremium(event.data.object);
        break;
      case 'customer.subscription.deleted':
        // Downgrade to free
        await this.deactivatePremium(event.data.object);
        break;
    }
  }

  private async activatePremium(session: any) {
    const userId = session.client_reference_id;
    // Update user in database
    // user.isPremium = true
    // user.subscriptionEndDate = new Date(...)
  }

  private async deactivatePremium(subscription: any) {
    // Downgrade user
  }
}
```

**Payment Controller:**
`backend/src/payment/payment.controller.ts`

```typescript
import { Controller, Post, Body, Headers, RawBodyRequest, Req } from '@nestjs/common';
import { PaymentService } from './payment.service';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('create-checkout')
  async createCheckout(@Body() body: { userId: string; plan: 'monthly' | 'yearly' }) {
    const session = await this.paymentService.createCheckoutSession(
      body.userId,
      body.plan
    );
    return { url: session.url };
  }

  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string
  ) {
    await this.paymentService.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}
```

#### C. Frontend Premium UI

**Pricing Page Component:**
`frontend/src/app/components/pricing/pricing.component.ts`

```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pricing-container">
      <h1>Choose Your Plan</h1>
      
      <div class="plans">
        <!-- Free Plan -->
        <div class="plan-card">
          <h2>Free</h2>
          <div class="price">$0<span>/month</span></div>
          <ul>
            <li>✓ 5 downloads per day</li>
            <li>✓ Up to 720p quality</li>
            <li>✗ Ads present</li>
            <li>✗ No history sync</li>
          </ul>
          <button class="btn-secondary" disabled>Current Plan</button>
        </div>

        <!-- Premium Monthly -->
        <div class="plan-card premium">
          <div class="badge">MOST POPULAR</div>
          <h2>Premium</h2>
          <div class="price">$4.99<span>/month</span></div>
          <ul>
            <li>✓ Unlimited downloads</li>
            <li>✓ Up to 4K quality</li>
            <li>✓ No ads</li>
            <li>✓ Priority servers</li>
            <li>✓ History sync</li>
            <li>✓ Batch downloads</li>
          </ul>
          <button class="btn-primary" (click)="subscribe('monthly')">
            Get Premium
          </button>
        </div>

        <!-- Premium Yearly -->
        <div class="plan-card">
          <div class="badge best-value">BEST VALUE</div>
          <h2>Premium Yearly</h2>
          <div class="price">$39.99<span>/year</span></div>
          <div class="savings">Save $20/year!</div>
          <ul>
            <li>✓ Everything in Premium</li>
            <li>✓ 33% cheaper</li>
            <li>✓ Priority support</li>
          </ul>
          <button class="btn-primary" (click)="subscribe('yearly')">
            Get Yearly
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pricing-container {
      padding: 60px 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      text-align: center;
      font-size: 48px;
      margin-bottom: 60px;
      background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .plans {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 30px;
    }

    .plan-card {
      background: rgba(26, 26, 46, 0.8);
      border: 2px solid var(--neon-blue);
      border-radius: 20px;
      padding: 40px 30px;
      position: relative;
      transition: transform 0.3s, box-shadow 0.3s;
    }

    .plan-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 20px 40px rgba(0, 243, 255, 0.3);
    }

    .plan-card.premium {
      border-color: var(--neon-purple);
      box-shadow: 0 0 30px rgba(191, 0, 255, 0.5);
    }

    .badge {
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--neon-purple);
      color: white;
      padding: 5px 20px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }

    .badge.best-value {
      background: var(--neon-green);
    }

    h2 {
      font-size: 32px;
      margin-bottom: 20px;
      text-align: center;
    }

    .price {
      font-size: 48px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 10px;
      color: var(--neon-blue);
    }

    .price span {
      font-size: 18px;
      color: rgba(255, 255, 255, 0.6);
    }

    .savings {
      text-align: center;
      color: var(--neon-green);
      font-weight: bold;
      margin-bottom: 20px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 30px 0;
    }

    ul li {
      padding: 10px 0;
      font-size: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .btn-primary, .btn-secondary {
      width: 100%;
      padding: 15px;
      font-size: 18px;
      font-weight: bold;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
    }

    .btn-primary {
      background: linear-gradient(45deg, var(--neon-blue), var(--neon-purple));
      color: white;
    }

    .btn-primary:hover {
      transform: scale(1.05);
      box-shadow: 0 10px 30px rgba(191, 0, 255, 0.5);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.5);
      cursor: not-allowed;
    }
  `]
})
export class PricingComponent {
  constructor(private http: HttpClient) {}

  subscribe(plan: 'monthly' | 'yearly') {
    // Get current user ID (from auth service)
    const userId = 'user_123'; // Placeholder

    this.http.post<{ url: string }>('http://your-backend/payment/create-checkout', {
      userId,
      plan
    }).subscribe(response => {
      // Redirect to Stripe checkout
      window.location.href = response.url;
    });
  }
}
```

#### D. Enforce Premium Features in Download Logic

```typescript
// In video-downloader.component.ts

async downloadVideo(format: VideoFormat) {
  // Check if user is premium
  if (!this.isPremium && format.quality === '4k') {
    this.showUpgradeModal('4K downloads require Premium subscription');
    return;
  }

  if (!this.isPremium && this.todayDownloadCount >= 5) {
    this.showUpgradeModal('Daily limit reached. Upgrade for unlimited downloads!');
    return;
  }

  // Proceed with download
  // ... existing code
}

showUpgradeModal(message: string) {
  // Show modal with upgrade CTA
  this.upgradeMessage = message;
  this.showUpgrade = true;
}
```

---

## 3️⃣ AFFILIATE MARKETING

### Recommended Partners

**VPN Services (High Commission):**
- **NordVPN:** 30-40% commission, $5-20 per sale
- **ExpressVPN:** $10-15 per sale
- **Surfshark:** 40% recurring commission

**Video Tools:**
- **Adobe Creative Cloud:** $8-20 per sale
- **Filmora:** 20% commission
- **Canva:** $36 per subscription

**Cloud Storage:**
- **Dropbox:** $99 per business signup
- **Google One:** Commission varies

### Implementation

**Create Banner Component:**
`frontend/src/app/components/affiliate-banner/affiliate-banner.component.ts`

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-affiliate-banner',
  standalone: true,
  template: `
    <div class="affiliate-banner">
      <div class="banner-content">
        <img src="/assets/nordvpn-logo.png" alt="NordVPN">
        <div class="text">
          <h3>🔒 Protect Your Privacy</h3>
          <p>Download safely with NordVPN - Get 63% OFF</p>
        </div>
        <a href="https://nordvpn.com/your-affiliate-link" 
           target="_blank" 
           class="cta-button">
          Get Deal
        </a>
      </div>
    </div>
  `,
  styles: [`
    .affiliate-banner {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      border-radius: 15px;
      padding: 20px;
      margin: 30px 0;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .banner-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    img {
      width: 80px;
      height: 80px;
      border-radius: 10px;
    }

    .text {
      flex: 1;
    }

    .text h3 {
      margin: 0 0 5px 0;
      color: white;
    }

    .text p {
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
    }

    .cta-button {
      padding: 12px 30px;
      background: white;
      color: #f5576c;
      text-decoration: none;
      border-radius: 8px;
      font-weight: bold;
      transition: transform 0.3s;
    }

    .cta-button:hover {
      transform: scale(1.05);
    }
  `]
})
export class AffiliateBannerComponent {}
```

---

## 4️⃣ REVENUE TRACKING DASHBOARD

**Create Analytics Service:**
`frontend/src/app/services/analytics.service.ts`

```typescript
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  trackDownload(quality: string, format: string) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'download', {
        'event_category': 'engagement',
        'event_label': `${format}_${quality}`,
        'value': 1
      });
    }
  }

  trackUpgradeClick(source: string) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'upgrade_click', {
        'event_category': 'conversion',
        'event_label': source,
        'value': 1
      });
    }
  }

  trackAffiliateClick(partner: string) {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'affiliate_click', {
        'event_category': 'monetization',
        'event_label': partner,
        'value': 1
      });
    }
  }
}
```

---

## 📊 EXPECTED REVENUE BREAKDOWN

### Scenario: 50,000 Monthly Users

**Ad Revenue:**
- Impressions: 150,000 (3 per user)
- CTR: 1.5%
- Clicks: 2,250
- CPC: $0.50
- **Monthly: $1,125**

**Premium Subscriptions:**
- Conversion: 2% (1,000 users)
- Price: $4.99/month
- **Monthly: $4,990**

**Affiliate Revenue:**
- Click-through: 5% (2,500)
- Conversion: 2% (50)
- Avg commission: $15
- **Monthly: $750**

**Total Monthly Revenue: $6,865**
**Annual: ~$82,000**

---

## 🎯 OPTIMIZATION TIPS

1. **A/B Test Pricing:** Try $3.99 vs $4.99
2. **Offer Free Trial:** 7-day premium trial
3. **Seasonal Discounts:** Black Friday, New Year
4. **Bundle Deals:** Yearly = 2 months free
5. **Referral Program:** Get 1 month free for each referral

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1 (Week 1):
- [ ] Google AdSense integration
- [ ] Legal disclaimers
- [ ] Analytics setup

### Phase 2 (Week 2-3):
- [ ] User authentication
- [ ] Download quotas
- [ ] Premium features UI

### Phase 3 (Week 4):
- [ ] Stripe integration
- [ ] Payment processing
- [ ] Subscription management

### Phase 4 (Month 2):
- [ ] Affiliate partnerships
- [ ] A/B testing
- [ ] Revenue optimization

---

**Next Steps:**
1. Choose monetization method (Start with AdSense!)
2. Implement user system if going premium
3. Test payment flow thoroughly
4. Monitor revenue and optimize

Need help implementing any of these? Let me know!
