import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import { NgIf } from '@angular/common';
import type { LpgCityScene } from './lpg-city-scene';

@Component({
  selector: 'app-lpg-world',
  standalone: true,
  template: `
    <div class="world-poster" aria-hidden="true"></div>
    <canvas #canvas class="world-canvas" [class.is-ready]="ready" aria-hidden="true"></canvas>
    <p class="world-status" *ngIf="loading" role="status">Building the LPG network…</p>
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      display: block;
      overflow: hidden;
      background: #efe4d1;
    }
    .world-poster,
    .world-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .world-poster {
      background:
        linear-gradient(
          90deg,
          rgba(20, 17, 13, 0.94) 0%,
          rgba(20, 17, 13, 0.62) 28%,
          transparent 58%
        ),
        url('/landing/lpg-world-poster.svg') center / cover no-repeat;
    }
    .world-canvas {
      opacity: 0;
      transition: opacity 700ms ease;
    }
    .world-canvas.is-ready {
      opacity: 1;
    }
    .world-status {
      position: absolute;
      right: 24px;
      bottom: 20px;
      margin: 0;
      color: #675d4f;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    @media (max-width: 767px) {
      .world-poster {
        background:
          linear-gradient(
            180deg,
            rgba(20, 17, 13, 0.78) 0%,
            transparent 52%,
            rgba(20, 17, 13, 0.72) 100%
          ),
          url('/landing/lpg-world-poster.svg') 58% center / cover no-repeat;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIf],
})
export class LpgWorldComponent implements AfterViewInit, OnDestroy {
  @Input()
  set reducedMotion(value: boolean) {
    this.motionEnabled = !value;
    if (!this.scene) return;
    if (this.motionEnabled) {
      this.startLoop();
    } else {
      this.stopLoop();
      this.scene.render(false);
    }
  }
  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;

  ready = false;
  loading = true;
  private scene: LpgCityScene | null = null;
  private frame = 0;
  private initializationTimer = 0;
  private lastRender = 0;
  private renderInterval = 1000 / 30;
  private progress = 0;
  private active = true;
  private motionEnabled = true;
  private resizeObserver: ResizeObserver | null = null;
  private intersectionObserver: IntersectionObserver | null = null;
  private destroyed = false;
  private visibilityHandler = () => {
    this.active = document.visibilityState === 'visible';
  };

  constructor(
    private readonly zone: NgZone,
    private readonly changeDetector: ChangeDetectorRef,
  ) {}

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.initializationTimer = window.setTimeout(() => {
        this.initializationTimer = 0;
        void this.initialize();
      }, 600);
    });
  }

  setProgress(progress: number): void {
    this.progress = progress;
    this.scene?.setProgress(this.progress);
    if (!this.motionEnabled) this.scene?.render(false);
  }

  setMotionEnabled(enabled: boolean): void {
    this.reducedMotion = !enabled;
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    window.clearTimeout(this.initializationTimer);
    this.stopLoop();
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.scene?.dispose();
    this.scene = null;
  }

  private async initialize(): Promise<void> {
    try {
      const { LpgCityScene } = await import('./lpg-city-scene');
      if (this.destroyed) return;
      const host = this.canvasRef.nativeElement.parentElement;
      if (!host) return;
      const mobile = window.innerWidth < 768;
      this.renderInterval = 1000 / (mobile ? 24 : 30);
      this.scene = new LpgCityScene(this.canvasRef.nativeElement, mobile);
      this.scene.setProgress(this.progress);
      const resize = () => {
        const bounds = host.getBoundingClientRect();
        this.scene?.resize(bounds.width, bounds.height);
        if (!this.motionEnabled) this.scene?.render(false);
      };
      this.resizeObserver = new ResizeObserver(resize);
      this.resizeObserver.observe(host);
      this.intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          this.active = entry.isIntersecting && document.visibilityState === 'visible';
        },
        { rootMargin: '150px' },
      );
      this.intersectionObserver.observe(host);
      document.addEventListener('visibilitychange', this.visibilityHandler);
      resize();
      this.scene.render(this.motionEnabled);
      this.zone.run(() => {
        this.ready = true;
        this.loading = false;
        this.changeDetector.markForCheck();
      });
      if (this.motionEnabled) this.startLoop();
    } catch (error) {
      console.warn(
        'The interactive LPG scene could not be initialized; using the static poster.',
        error,
      );
      this.zone.run(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      });
    }
  }

  private loop = (timestamp = 0): void => {
    if (this.destroyed || !this.motionEnabled) {
      this.frame = 0;
      return;
    }
    if (this.active && timestamp - this.lastRender >= this.renderInterval) {
      this.scene?.render(true);
      this.lastRender = timestamp;
    }
    this.frame = requestAnimationFrame(this.loop);
  };

  private startLoop(): void {
    if (this.destroyed || this.frame) return;
    this.lastRender = 0;
    this.frame = requestAnimationFrame(this.loop);
  }

  private stopLoop(): void {
    if (!this.frame) return;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
