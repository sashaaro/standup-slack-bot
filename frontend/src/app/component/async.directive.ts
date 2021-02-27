import {
  ComponentFactoryResolver,
  Directive,
  ElementRef, EmbeddedViewRef,
  Injector,
  Input,
  OnInit,
  Renderer2,
  TemplateRef,
  ViewContainerRef
} from '@angular/core';
import {Observable} from "rxjs";
import {LoaderComponent} from "./loader/loader.component";
import {UntilDestroy, untilDestroyed} from "@ngneat/until-destroy";

const CLASS_LOADER_CONTAINER = 'loader-container'

@UntilDestroy()
@Directive({
  selector: '[appAsync]'
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

  constructor(
    private containerRef: ViewContainerRef,
    private templateRef: TemplateRef<any>,
    private element: ElementRef<HTMLElement>,
    private render: Renderer2,
    private resolver: ComponentFactoryResolver,
    private injector: Injector
  ) {

  }

  ngOnInit() {
    let rootRef;
    let placeholderViewRef: EmbeddedViewRef<any>;
    let viewRef: EmbeddedViewRef<any>;

    const loader = this.resolver.resolveComponentFactory(LoaderComponent).create(this.injector);
    if (this.placeholder) {
      placeholderViewRef = this.containerRef.createEmbeddedView(loader.instance.placeholderRef);
      rootRef = placeholderViewRef.rootNodes[0] as HTMLElement;
    } else {
      viewRef = this.containerRef.createEmbeddedView(this.templateRef, this.context);
      rootRef = viewRef.rootNodes[0] as HTMLElement;
    }

    this.render.appendChild(rootRef, loader.location.nativeElement);

    rootRef.classList.add(CLASS_LOADER_CONTAINER);
    this.stream$
      .pipe(untilDestroyed(this))
      .subscribe(context => {
        rootRef.classList.remove(CLASS_LOADER_CONTAINER);
        this.render.removeChild(rootRef, loader.location.nativeElement);
        if (placeholderViewRef) {
          placeholderViewRef.destroy();
          placeholderViewRef = null;
          viewRef = this.containerRef.createEmbeddedView(this.templateRef, this.context);
        }

        this.context.$implicit = context;
        this.context.content = context;
        viewRef.markForCheck();
      })
  }

}
