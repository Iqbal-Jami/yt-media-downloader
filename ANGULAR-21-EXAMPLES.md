# 🎯 Angular 21 - Practical Usage Examples

## Quick Reference for Common Patterns

---

## 1. Signal-based Form Handling

```typescript
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="search-form">
      <input
        type="text"
        [(ngModel)]="searchQuery"
        (input)="onSearchInput($event)"
        placeholder="Search videos..."
      />
      
      @if (isSearching()) {
        <span class="loading">Searching...</span>
      }
      
      @if (searchResults(); as results) {
        <div class="results">
          @for (result of results; track result.id) {
            <div class="result-item">{{ result.title }}</div>
          }
        </div>
      }
      
      <!-- Computed validation -->
      @if (validationError()) {
        <p class="error">{{ validationError() }}</p>
      }
    </div>
  `
})
export class SearchFormComponent {
  searchQuery = '';
  
  // Signals
  private _searchTerm = signal('');
  private _isSearching = signal(false);
  private _searchResults = signal<any[]>([]);
  
  // Read-only computed
  readonly isSearching = this._isSearching.asReadonly();
  readonly searchResults = this._searchResults.asReadonly();
  
  // Computed validation
  readonly validationError = computed(() => {
    const term = this._searchTerm();
    if (term.length > 0 && term.length < 3) {
      return 'Search term must be at least 3 characters';
    }
    return '';
  });
  
  // Computed: Whether search is valid
  readonly isValidSearch = computed(() => 
    this._searchTerm().length >= 3 && !this.validationError()
  );
  
  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this._searchTerm.set(value);
    
    // Debounced search (you'd use a timer in real code)
    if (this.isValidSearch()) {
      this.performSearch(value);
    }
  }
  
  private async performSearch(term: string) {
    this._isSearching.set(true);
    
    try {
      const response = await fetch(`/api/search?q=${term}`);
      const results = await response.json();
      this._searchResults.set(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      this._isSearching.set(false);
    }
  }
}
```

---

## 2. Resource API with Pagination

```typescript
import { Component, signal, resource, computed } from '@angular/core';

@Component({
  selector: 'app-video-list',
  standalone: true,
  template: `
    <div class="video-list">
      @if (videosResource.isLoading()) {
        <div class="skeleton-loader">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton"></div>
          }
        </div>
      }
      
      @if (videosResource.error(); as error) {
        <div class="error-box">
          <p>{{ error.message }}</p>
          <button (click)="videosResource.reload()">Retry</button>
        </div>
      }
      
      @if (videosResource.value(); as data) {
        <div class="videos">
          @for (video of data.videos; track video.id) {
            <div class="video-card">
              <img [src]="video.thumbnail" />
              <h3>{{ video.title }}</h3>
            </div>
          }
        </div>
        
        <!-- Pagination -->
        <div class="pagination">
          <button 
            (click)="previousPage()" 
            [disabled]="currentPage() === 1">
            Previous
          </button>
          
          <span>Page {{ currentPage() }} of {{ totalPages() }}</span>
          
          <button 
            (click)="nextPage()" 
            [disabled]="currentPage() >= totalPages()">
            Next
          </button>
        </div>
      }
    </div>
  `
})
export class VideoListComponent {
  // Pagination signals
  private _currentPage = signal(1);
  private _pageSize = signal(12);
  
  readonly currentPage = this._currentPage.asReadonly();
  
  // Angular 21: Resource API with pagination
  videosResource = resource({
    request: () => ({
      page: this._currentPage(),
      pageSize: this._pageSize()
    }),
    
    loader: async ({ request }) => {
      const response = await fetch(
        `/api/videos?page=${request.page}&size=${request.pageSize}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to load videos');
      }
      
      return await response.json();
    }
  });
  
  // Computed: Total pages
  readonly totalPages = computed(() => {
    const data = this.videosResource.value();
    return data ? Math.ceil(data.total / this._pageSize()) : 0;
  });
  
  nextPage() {
    this._currentPage.update(p => p + 1);
  }
  
  previousPage() {
    this._currentPage.update(p => Math.max(1, p - 1));
  }
  
  goToPage(page: number) {
    this._currentPage.set(page);
  }
}
```

---

## 3. Shopping Cart with Signals (Complex State)

```typescript
import { Injectable, signal, computed, effect } from '@angular/core';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  // Writable signal for cart items
  private _items = signal<CartItem[]>([]);
  
  // Read-only access
  readonly items = this._items.asReadonly();
  
  // Computed: Total items count
  readonly itemCount = computed(() => 
    this._items().reduce((sum, item) => sum + item.quantity, 0)
  );
  
  // Computed: Total price
  readonly totalPrice = computed(() => 
    this._items().reduce((sum, item) => sum + (item.price * item.quantity), 0)
  );
  
  // Computed: Formatted total
  readonly formattedTotal = computed(() => 
    `$${this.totalPrice().toFixed(2)}`
  );
  
  // Computed: Is cart empty
  readonly isEmpty = computed(() => this._items().length === 0);
  
  // Computed: Discount (example)
  readonly discount = computed(() => {
    const total = this.totalPrice();
    if (total > 100) return total * 0.1; // 10% off
    if (total > 50) return total * 0.05; // 5% off
    return 0;
  });
  
  // Computed: Final total with discount
  readonly finalTotal = computed(() => 
    this.totalPrice() - this.discount()
  );
  
  constructor() {
    // Effect: Save to localStorage
    effect(() => {
      const items = this._items();
      localStorage.setItem('cart', JSON.stringify(items));
    });
    
    // Effect: Log when cart changes
    effect(() => {
      console.log('Cart updated:', {
        items: this.itemCount(),
        total: this.formattedTotal()
      });
    });
    
    // Load from localStorage
    this.loadFromStorage();
  }
  
  // Add item to cart
  addItem(item: Omit<CartItem, 'quantity'>) {
    this._items.update(items => {
      const existingIndex = items.findIndex(i => i.id === item.id);
      
      if (existingIndex > -1) {
        // Increase quantity
        const updated = [...items];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        };
        return updated;
      } else {
        // Add new item
        return [...items, { ...item, quantity: 1 }];
      }
    });
  }
  
  // Remove item
  removeItem(itemId: string) {
    this._items.update(items => items.filter(i => i.id !== itemId));
  }
  
  // Update quantity
  updateQuantity(itemId: string, quantity: number) {
    if (quantity <= 0) {
      this.removeItem(itemId);
      return;
    }
    
    this._items.update(items => 
      items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  }
  
  // Clear cart
  clearCart() {
    this._items.set([]);
  }
  
  private loadFromStorage() {
    const stored = localStorage.getItem('cart');
    if (stored) {
      try {
        const items = JSON.parse(stored);
        this._items.set(items);
      } catch (e) {
        console.error('Failed to load cart:', e);
      }
    }
  }
}

// Usage in Component
@Component({
  selector: 'app-cart',
  template: `
    <div class="cart">
      <h2>Shopping Cart ({{ cart.itemCount() }})</h2>
      
      @if (cart.isEmpty()) {
        <p>Your cart is empty</p>
      } @else {
        @for (item of cart.items(); track item.id) {
          <div class="cart-item">
            <h3>{{ item.name }}</h3>
            <p>{{ item.price | currency }}</p>
            
            <div class="quantity">
              <button (click)="updateQuantity(item.id, item.quantity - 1)">-</button>
              <span>{{ item.quantity }}</span>
              <button (click)="updateQuantity(item.id, item.quantity + 1)">+</button>
            </div>
            
            <button (click)="cart.removeItem(item.id)">Remove</button>
          </div>
        }
        
        <div class="cart-total">
          <p>Subtotal: {{ cart.totalPrice() | currency }}</p>
          
          @if (cart.discount() > 0) {
            <p class="discount">Discount: -{{ cart.discount() | currency }}</p>
          }
          
          <h3>Total: {{ cart.finalTotal() | currency }}</h3>
          
          <button (click)="checkout()" class="checkout-btn">
            Checkout
          </button>
        </div>
      }
    </div>
  `
})
export class CartComponent {
  cart = inject(CartService);
  
  updateQuantity(id: string, qty: number) {
    this.cart.updateQuantity(id, qty);
  }
  
  checkout() {
    // Checkout logic
    console.log('Checking out with:', {
      items: this.cart.items(),
      total: this.cart.finalTotal()
    });
  }
}
```

---

## 4. Real-time Updates with Signals

```typescript
import { Component, signal, effect } from '@angular/core';

@Component({
  selector: 'app-live-stats',
  template: `
    <div class="stats-dashboard">
      <div class="stat-card">
        <h3>Active Users</h3>
        <p class="big-number">{{ activeUsers() }}</p>
        <span class="trend" [class.up]="userTrend() > 0">
          {{ userTrend() > 0 ? '↑' : '↓' }} {{ Math.abs(userTrend()) }}
        </span>
      </div>
      
      <div class="stat-card">
        <h3>Downloads Today</h3>
        <p class="big-number">{{ downloadsToday() }}</p>
      </div>
      
      <div class="stat-card">
        <h3>Server Load</h3>
        <p class="big-number">{{ serverLoad() }}%</p>
        <div class="progress-bar">
          <div 
            class="progress" 
            [style.width.%]="serverLoad()"
            [class.high]="serverLoad() > 80">
          </div>
        </div>
      </div>
      
      <!-- Last updated -->
      <p class="last-update">
        Last updated: {{ lastUpdate() | date:'short' }}
      </p>
    </div>
  `
})
export class LiveStatsComponent {
  // Signals for real-time data
  activeUsers = signal(0);
  downloadsToday = signal(0);
  serverLoad = signal(0);
  lastUpdate = signal(new Date());
  
  // Previous value for trend
  private previousUsers = signal(0);
  
  // Computed trend
  userTrend = computed(() => 
    this.activeUsers() - this.previousUsers()
  );
  
  Math = Math; // For template
  
  constructor() {
    // Start polling
    this.startPolling();
    
    // Effect: Alert on high server load
    effect(() => {
      const load = this.serverLoad();
      if (load > 90) {
        console.warn('⚠️ HIGH SERVER LOAD:', load);
      }
    });
  }
  
  private startPolling() {
    setInterval(async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        // Update signals
        this.previousUsers.set(this.activeUsers());
        this.activeUsers.set(data.activeUsers);
        this.downloadsToday.set(data.downloads);
        this.serverLoad.set(data.serverLoad);
        this.lastUpdate.set(new Date());
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    }, 5000); // Poll every 5 seconds
  }
}
```

---

## 5. Form Validation with Signals

```typescript
import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-signup-form',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form class="signup-form" (submit)="onSubmit($event)">
      <div class="form-group">
        <label>Email</label>
        <input
          type="email"
          [(ngModel)]="email"
          name="email"
          (input)="emailSignal.set(email)"
        />
        @if (emailError()) {
          <span class="error">{{ emailError() }}</span>
        }
      </div>
      
      <div class="form-group">
        <label>Password</label>
        <input
          type="password"
          [(ngModel)]="password"
          name="password"
          (input)="passwordSignal.set(password)"
        />
        @if (passwordError()) {
          <span class="error">{{ passwordError() }}</span>
        }
        
        <!-- Password strength indicator -->
        <div class="strength-meter">
          <div 
            class="strength-bar" 
            [style.width.%]="passwordStrength()"
            [class]="passwordStrengthClass()">
          </div>
        </div>
        <span class="strength-text">{{ passwordStrengthText() }}</span>
      </div>
      
      <div class="form-group">
        <label>Confirm Password</label>
        <input
          type="password"
          [(ngModel)]="confirmPassword"
          name="confirmPassword"
          (input)="confirmPasswordSignal.set(confirmPassword)"
        />
        @if (confirmPasswordError()) {
          <span class="error">{{ confirmPasswordError() }}</span>
        }
      </div>
      
      <button 
        type="submit" 
        [disabled]="!isFormValid()"
        [class.disabled]="!isFormValid()">
        Sign Up
      </button>
      
      @if (isFormValid()) {
        <p class="success">✓ Form is valid, ready to submit!</p>
      }
    </form>
  `
})
export class SignupFormComponent {
  // NgModel bindings
  email = '';
  password = '';
  confirmPassword = '';
  
  // Signals for reactive validation
  emailSignal = signal('');
  passwordSignal = signal('');
  confirmPasswordSignal = signal('');
  
  // Computed validations
  emailError = computed(() => {
    const email = this.emailSignal();
    if (!email) return '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return 'Invalid email format';
    }
    return '';
  });
  
  passwordError = computed(() => {
    const pwd = this.passwordSignal();
    if (!pwd) return '';
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters';
    }
    if (!/(?=.*[a-z])/.test(pwd)) {
      return 'Password must contain lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(pwd)) {
      return 'Password must contain uppercase letter';
    }
    if (!/(?=.*\d)/.test(pwd)) {
      return 'Password must contain number';
    }
    return '';
  });
  
  confirmPasswordError = computed(() => {
    const confirm = this.confirmPasswordSignal();
    const pwd = this.passwordSignal();
    if (!confirm) return '';
    if (confirm !== pwd) {
      return 'Passwords do not match';
    }
    return '';
  });
  
  // Password strength (0-100)
  passwordStrength = computed(() => {
    const pwd = this.passwordSignal();
    let strength = 0;
    
    if (pwd.length >= 8) strength += 25;
    if (pwd.length >= 12) strength += 15;
    if (/[a-z]/.test(pwd)) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 15;
    if (/\d/.test(pwd)) strength += 15;
    if (/[^a-zA-Z\d]/.test(pwd)) strength += 15;
    
    return Math.min(strength, 100);
  });
  
  passwordStrengthClass = computed(() => {
    const strength = this.passwordStrength();
    if (strength < 30) return 'weak';
    if (strength < 60) return 'medium';
    return 'strong';
  });
  
  passwordStrengthText = computed(() => {
    const strength = this.passwordStrength();
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Medium';
    return 'Strong';
  });
  
  // Form validity
  isFormValid = computed(() => {
    return (
      !this.emailError() &&
      !this.passwordError() &&
      !this.confirmPasswordError() &&
      this.emailSignal().length > 0 &&
      this.passwordSignal().length > 0 &&
      this.confirmPasswordSignal().length > 0
    );
  });
  
  onSubmit(event: Event) {
    event.preventDefault();
    
    if (this.isFormValid()) {
      console.log('Form submitted:', {
        email: this.emailSignal(),
        password: this.passwordSignal()
      });
      // Submit to server
    }
  }
}
```

---

## 6. Dark Mode Toggle with Signal

```typescript
import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private _isDark = signal(true);
  
  readonly isDark = this._isDark.asReadonly();
  readonly theme = computed(() => this._isDark() ? 'dark' : 'light');
  
  constructor() {
    // Load from localStorage
    const stored = localStorage.getItem('theme');
    if (stored) {
      this._isDark.set(stored === 'dark');
    }
    
    // Effect: Update document class
    effect(() => {
      const isDark = this._isDark();
      document.documentElement.classList.toggle('dark', isDark);
      document.documentElement.classList.toggle('light', !isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
  
  toggle() {
    this._isDark.update(v => !v);
  }
  
  setDark(isDark: boolean) {
    this._isDark.set(isDark);
  }
}

// Component
@Component({
  selector: 'app-theme-toggle',
  template: `
    <button 
      (click)="theme.toggle()" 
      class="theme-toggle"
      [attr.aria-label]="theme.isDark() ? 'Switch to light mode' : 'Switch to dark mode'">
      {{ theme.isDark() ? '🌙' : '☀️' }}
    </button>
  `
})
export class ThemeToggleComponent {
  theme = inject(ThemeService);
}
```

---

These examples show Angular 21's powerful features in real-world scenarios! 🚀
