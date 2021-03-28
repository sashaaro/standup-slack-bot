import {
  ComponentFactoryResolver, ComponentRef,
  Directive,
  ElementRef, EmbeddedViewRef, Inject, InjectionToken,
  Injector,
  Input,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import {Observable, Subject} from "rxjs";
import {LoaderComponent} from "./loader/loader.component";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";
import {withLatestFrom} from "rxjs/operators";

const CLASS_LOADER_CONTAINER = 'loader-container'

export const CONTAINER_LOADING = new InjectionToken<Subject<boolean>>('app.container_loading')

@UntilDestroy()
@Directive({
  selector: '[appAsync]',
  providers: [
    {
      provide: CONTAINER_LOADING,
      useFactory: function () { return new Subject<boolean>() }
    }
  ]
})
export class AsyncDirective<T> implements OnInit {
  @Input('appAsync') stream$: Observable<T>
  @Input('appAsyncPlaceholder') placeholder = false

  public context: {
    content: T | undefined;
    $implicit: T | undefined;
  } = {
    content: undefined,
    $implicit: undefined,
  }

  private loader: ComponentRef<LoaderComponent>;
  private rootRef: HTMLElement;
  private placeholderViewRef: EmbeddedViewRef<any>;
  private viewRef: EmbeddedViewRef<any>;

  constructor(
    private containerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private element: ElementRef<HTMLElement>,
    private render: Renderer2,
    private resolver: ComponentFactoryResolver,
    private injector: Injector,
    @Inject(CONTAINER_LOADING) private loadingSubject: Subject<boolean>
  ) {
  }

  ngOnInit() {
    this.loadingSubject.pipe(
      //withLatestFrom(this.stream$),
      untilDestroyed(this)
    ).subscribe((loading) => {
      this.loading(loading, true)
    })

    this.loader = this.resolver
      .resolveComponentFactory(LoaderComponent)
      .create(this.injector);
    if (this.placeholder) {
      this.placeholderViewRef = this.containerRef.createEmbeddedView(this.loader.instance.placeholderRef);
      this.rootRef = this.placeholderViewRef.rootNodes[0] as HTMLElement;
    } else {
      this.viewRef = this.containerRef.createEmbeddedView(this.templateRef, this.context);
      this.rootRef = this.viewRef.rootNodes[0] as HTMLElement;
    }

    this.loading(true);
    this.stream$
      .pipe(untilDestroyed(this))
      .subscribe(context => {
        this.loading(false);
        this.showContent(context)
      })
  }

  loading(enable = true, light = false) {
    if (enable) {
      this.render.appendChild(this.rootRef, this.loader.location.nativeElement);
      light ?
        this.loader.location.nativeElement.classList.add('light') :
        this.loader.location.nativeElement.classList.remove('light')

      this.rootRef.classList.add(CLASS_LOADER_CONTAINER);
    } else {
      this.rootRef.classList.remove(CLASS_LOADER_CONTAINER);

      this.render.removeChild(this.rootRef, this.loader.location.nativeElement);
    }
  }

  private showContent(context: T) {
    if (this.placeholderViewRef) {
      this.placeholderViewRef.destroy();
      this.placeholderViewRef = null;
      this.viewRef = this.containerRef.createEmbeddedView(this.templateRef, this.context);
    }

    this.context.$implicit = context;
    this.context.content = context;
    this.viewRef.markForCheck();
  }

}
