import { CommonModule, DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowDown,
  LucideArrowRight,
  LucideCheck,
  LucideCircleAlert,
  LucideMenu,
  LucidePause,
  LucidePlay,
  LucideX,
} from '@lucide/angular';
import { PortalApiService } from '../../core/api/portal-api.service';
import { LpgWorldComponent } from './scene/lpg-world.component';

type AuthMode = 'login' | 'activate' | 'reset';

interface ProductEvidence {
  key: 'overview' | 'inventory' | 'business';
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
}

@Component({
  selector: 'app-lpg-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    LpgWorldComponent,
    LucideArrowDown,
    LucideArrowRight,
    LucideCheck,
    LucideCircleAlert,
    LucideMenu,
    LucidePause,
    LucidePlay,
    LucideX,
  ],
  templateUrl: './lpg-landing-page.component.html',
  styleUrl: './lpg-landing-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LpgLandingPageComponent implements AfterViewInit, OnDestroy {
  @Output() readonly authenticated = new EventEmitter<void>();
  @ViewChild('story', { static: true }) private storyRef!: ElementRef<HTMLElement>;
  @ViewChild('world', { static: true }) private world!: LpgWorldComponent;
  @ViewChild('usernameInput') private usernameInput?: ElementRef<HTMLInputElement>;

  private readonly motionMedia = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly motionStorageKey = 'vmjam.landing.motion';
  readonly evidence: ProductEvidence[] = [
    {
      key: 'overview',
      eyebrow: 'Daily position',
      title: 'Know the condition of a store in seconds.',
      description:
        'Gross sales, recorded profit, balances, inventory alerts, trends, and snapshot freshness share one dependable starting point.',
      image: '/landing/dashboard-overview.png',
      alt: 'VMJAM Sales owner dashboard overview with sales, profit, balances, and inventory alerts.',
    },
    {
      key: 'inventory',
      eyebrow: 'Cylinder stock',
      title: 'Separate what is filled, empty, critical, and moving.',
      description:
        'Review store and warehouse quantities, refill pricing, recorded value, movement history, and practical reorder signals.',
      image: '/landing/dashboard-inventory.png',
      alt: 'VMJAM Sales inventory report showing LPG stock and inventory status.',
    },
    {
      key: 'business',
      eyebrow: 'Owner view',
      title: 'Run several branches by exception.',
      description:
        'Compare authorized stores and focus on stale snapshots, low stock, unusual discounts, overdue balances, and backup health.',
      image: '/landing/dashboard-business.png',
      alt: 'VMJAM Sales multi-store business overview and owner alerts.',
    },
  ];
  readonly chapters = [
    { index: '01', kicker: 'The network', title: 'One operation. One owner view.' },
    { index: '02', kicker: 'Supply', title: 'Know what came in.' },
    { index: '03', kicker: 'Cylinder flow', title: 'Separate filled from empty.' },
    { index: '04', kicker: 'Sales', title: 'See what sells—and what earns.' },
    { index: '05', kicker: 'Collections', title: 'Turn sales into collected cash.' },
    { index: '06', kicker: 'Branches', title: 'Manage every store by exception.' },
    { index: '07', kicker: 'The decision', title: 'Clarity before the next move.' },
  ];

  authMode: AuthMode = 'login';
  username = '';
  password = '';
  activationToken = '';
  resetToken = '';
  authBusy = false;
  authError = '';
  authSuccess = '';
  mobileMenuOpen = false;
  selectedEvidence = this.evidence[0];
  scrolled = false;
  motionEnabled = this.initialMotionEnabled();
  private gsapContext: { revert(): void } | null = null;
  private scrollTrigger: { kill(): void } | null = null;
  private chapterObserver: IntersectionObserver | null = null;
  private motionGeneration = 0;
  private destroyed = false;
  private viewReady = false;
  private motionOverride = this.readMotionOverride();
  private readonly motionPreferenceHandler = (event: MediaQueryListEvent) => {
    if (this.motionOverride || !this.viewReady) return;
    this.applyMotionEnabled(!event.matches);
  };
  private previousTitle = '';
  private previousDescription = '';
  private previousRobots = '';

  constructor(
    readonly api: PortalApiService,
    private readonly changeDetector: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {
    this.previousTitle = this.document.title;
    this.previousDescription =
      this.document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? '';
    this.previousRobots =
      this.document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? '';
    this.setMetadata(
      'LPG Owner Dashboard | VMJAM Sales',
      'Review synchronized LPG sales, filled and empty cylinder stock, cash flow, balances, and multi-store performance with VMJAM Sales.',
      'index,follow',
    );
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.motionMedia.addEventListener('change', this.motionPreferenceHandler);
    if (this.motionEnabled) {
      void this.initializeMotion();
    } else {
      this.initializeStaticStory();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.scrollTrigger?.kill();
    this.gsapContext?.revert();
    this.chapterObserver?.disconnect();
    this.motionMedia.removeEventListener('change', this.motionPreferenceHandler);
    this.setMetadata(this.previousTitle, this.previousDescription, this.previousRobots);
  }

  async authenticate(): Promise<void> {
    const credential =
      this.authMode === 'login'
        ? this.username
        : this.authMode === 'activate'
          ? this.activationToken
          : this.resetToken;
    if (!this.password || !credential) return;
    this.authBusy = true;
    this.authError = '';
    this.authSuccess = '';
    try {
      if (this.authMode === 'reset') {
        await this.api.resetPassword(this.resetToken, this.password);
        this.password = '';
        this.resetToken = '';
        this.authMode = 'login';
        this.authSuccess = 'Password updated. Sign in with your new password.';
        queueMicrotask(() => this.usernameInput?.nativeElement.focus());
        return;
      }
      if (this.authMode === 'login') {
        await this.api.login(this.username, this.password);
      } else {
        await this.api.activate(this.activationToken, this.password);
      }
      this.password = '';
      this.authenticated.emit();
    } catch (error) {
      this.authError = this.message(
        error,
        'Sign in failed. Check the account details and server connection.',
      );
    } finally {
      this.authBusy = false;
      this.changeDetector.markForCheck();
    }
  }

  switchAuthMode(mode: AuthMode): void {
    this.authMode = mode;
    this.authError = '';
    this.authSuccess = '';
    this.password = '';
    this.changeDetector.markForCheck();
  }

  focusAuth(): void {
    this.mobileMenuOpen = false;
    this.document.getElementById('owner-access')?.scrollIntoView({
      behavior: this.motionEnabled ? 'smooth' : 'auto',
      block: 'center',
    });
    window.setTimeout(
      () => this.usernameInput?.nativeElement.focus(),
      this.motionEnabled ? 500 : 0,
    );
  }

  scrollToStory(): void {
    this.document.getElementById('how-it-works')?.scrollIntoView({
      behavior: this.motionEnabled ? 'smooth' : 'auto',
    });
  }

  toggleMotion(): void {
    this.motionOverride = this.motionEnabled ? 'paused' : 'enabled';
    try {
      window.sessionStorage.setItem(this.motionStorageKey, this.motionOverride);
    } catch {
      // A privacy setting can block storage; the current page choice still applies.
    }
    this.applyMotionEnabled(!this.motionEnabled);
  }

  selectEvidence(item: ProductEvidence): void {
    this.selectedEvidence = item;
    this.changeDetector.markForCheck();
  }

  trackChapter(_: number, chapter: { index: string }): string {
    return chapter.index;
  }

  private async initializeMotion(): Promise<void> {
    this.chapterObserver?.disconnect();
    this.chapterObserver = null;
    this.teardownMotion();
    const generation = this.motionGeneration;
    try {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (this.destroyed || !this.motionEnabled || generation !== this.motionGeneration) return;
      gsap.registerPlugin(ScrollTrigger);
      const story = this.storyRef.nativeElement;
      this.gsapContext = gsap.context(() => {
        const chapters = Array.from(story.querySelectorAll<HTMLElement>('.story-chapter'));
        for (const chapter of chapters) {
          gsap.fromTo(
            chapter.querySelector('.chapter-copy'),
            { y: 42 },
            {
              y: 0,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: chapter,
                start: 'top 68%',
                end: 'center 48%',
                scrub: 0.6,
              },
            },
          );
        }
        this.scrollTrigger = ScrollTrigger.create({
          trigger: story,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.55,
          onUpdate: (self) => {
            this.world.setProgress(self.progress);
            const nextScrolled = self.progress > 0.025;
            if (nextScrolled !== this.scrolled) {
              this.scrolled = nextScrolled;
              this.changeDetector.detectChanges();
            }
          },
        });
      }, story);
      requestAnimationFrame(() => ScrollTrigger.refresh());
    } catch {
      // The semantic page and poster remain complete when motion enhancement cannot load.
    }
  }

  private initializeStaticStory(): void {
    this.teardownMotion();
    this.chapterObserver?.disconnect();
    const chapters = Array.from(
      this.storyRef.nativeElement.querySelectorAll<HTMLElement>('.story-chapter'),
    );
    const updateChapter = (chapter: Element) => {
      const index = chapters.indexOf(chapter as HTMLElement);
      if (index < 0) return;
      this.world.setProgress(index / Math.max(1, chapters.length - 1));
      const nextScrolled = index > 0;
      if (nextScrolled !== this.scrolled) {
        this.scrolled = nextScrolled;
        this.changeDetector.markForCheck();
      }
    };
    this.chapterObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
        if (visible) updateChapter(visible.target);
      },
      { rootMargin: '-30% 0px -30% 0px', threshold: [0, 0.25, 0.5, 0.75] },
    );
    for (const chapter of chapters) this.chapterObserver.observe(chapter);
    const current = chapters.find(
      (chapter) => chapter.getBoundingClientRect().bottom > window.innerHeight * 0.3,
    );
    if (current) updateChapter(current);
  }

  private applyMotionEnabled(enabled: boolean): void {
    if (this.motionEnabled === enabled) return;
    this.motionEnabled = enabled;
    this.world.setMotionEnabled(enabled);
    if (enabled) {
      void this.initializeMotion();
    } else {
      this.initializeStaticStory();
    }
    this.changeDetector.markForCheck();
  }

  private teardownMotion(): void {
    this.motionGeneration += 1;
    this.scrollTrigger?.kill();
    this.scrollTrigger = null;
    this.gsapContext?.revert();
    this.gsapContext = null;
  }

  private initialMotionEnabled(): boolean {
    const override = this.readMotionOverride();
    if (override === 'enabled') return true;
    if (override === 'paused') return false;
    return !this.motionMedia.matches;
  }

  private readMotionOverride(): 'enabled' | 'paused' | null {
    try {
      const value = window.sessionStorage.getItem(this.motionStorageKey);
      return value === 'enabled' || value === 'paused' ? value : null;
    } catch {
      return null;
    }
  }

  private setMetadata(title: string, description: string, robots: string): void {
    this.document.title = title;
    this.setMeta('description', description);
    this.setMeta('robots', robots);
  }

  private setMeta(name: string, content: string): void {
    let element = this.document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
    if (!element) {
      element = this.document.createElement('meta');
      element.name = name;
      this.document.head.appendChild(element);
    }
    element.content = content;
  }

  private message(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const body = (error as { error?: { message?: unknown } }).error;
      if (typeof body?.message === 'string' && body.message.trim()) return body.message;
    }
    if (error instanceof Error && error.message.trim()) return error.message;
    return fallback;
  }
}
