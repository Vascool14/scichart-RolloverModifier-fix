import { getFunction } from "scichart";
import { IIncludeSeries } from "scichart";
import { Point } from "scichart";
import { Rect } from "scichart";
import { EBaseType } from "scichart";
import { EChart2DModifierType } from "scichart";
import { RequiredOwnProps } from "scichart";
import { EMousePosition } from "scichart";
import { ESeriesType } from "scichart";
import { checkHasOverlap, getTooltipPositionProperties, spreadTooltips, TPositionPoperties, getEndPoint, getStartPoint } from "./tooltip";
import { translateFromCanvasToSeriesViewRect, translateToNotScaled } from "scichart";
import { SeriesInfo } from "scichart";
import { XyySeriesInfo } from "scichart";
import { AUTO_COLOR, IThemeProvider } from "scichart";
import { ECoordinateMode } from "scichart";
import { LineAnnotation } from "scichart";
import { RolloverLegendSvgAnnotation } from "scichart";
import { RolloverMarkerSvgAnnotation } from "scichart";
import { RolloverTooltipSvgAnnotation } from "scichart";
import { BaseStackedCollection } from "scichart";
import { BaseStackedRenderableSeries } from "scichart";
import { FastBandRenderableSeries } from "scichart";
import { HitTestInfo } from "scichart";
import { IRenderableSeries } from "scichart";
import {
    IRolloverModifier,
    RolloverModifierRenderableSeriesProps
} from "scichart";
import { SciChartSurfaceBase } from "scichart";
import { DpiHelper } from "scichart";
import { ChartModifierBase2D, IChartModifierBaseOptions } from "scichart";
import { PROPERTY } from "./PROPERTY";
import { ModifierMouseArgs } from "scichart";

export type TRolloverLegendSvgTemplate = (
    seriesInfos: SeriesInfo[],
    svgAnnotation: RolloverLegendSvgAnnotation
) => string;

export type TRolloverTooltipDataTemplate = (
    seriesInfo: SeriesInfo,
    tooltipTitle: string,
    tooltipLabelX: string,
    tooltipLabelY: string
) => string[];

/**
 * @ignore
 * Props type used for tooltips in the {@link RolloverModifier}
 */
export type TTooltipProps = {
    /**
     * The index to the data on the tooltip
     */
    index: number;
    /**
     * The XValue of the data on the tooltip
     */
    xValue: number;
    /**
     * The YValue of the data on the tooltip
     */
    yValue: number;
    /**
     * The XCoordinate of the tooltip
     */
    xCoord: number;
    /**
     * The YCoordinate of the tooltip
     */
    yCoord: number;
    /**
     * The xCoordShift for the svg annotation, not scaled value
     */
    xCoordShift: number;
    /**
     * The yCoordShift for the svg annotation, not scaled value
     */
    yCoordShift: number;
    hitTestPointValues: Point;
    isCategoryAxis: boolean;
    isY1: boolean;
    height: number;
    width: number;
    seriesInfo: SeriesInfo;
};

/** @ignore */
export const TOOLTIP_SPACING = 4;

/**
 * Optional parameters used to configure a {@link RolloverModifier} at construct time
 */
export interface IRolloverModifierOptions extends IChartModifierBaseOptions {
    /** Sets the color of the vertical rollover line as an html color code */
    rolloverLineStroke?: string;
    /** Sets the thickness of the vertical rollover line */
    rolloverLineStrokeThickness?: number;
    /** Gets or Sets the dash array of the vertical rollover line */
    rolloverLineStrokeDashArray?: number[];
    /** Gets or Sets whether to show the vertical rollover line. Default true */
    showRolloverLine?: boolean;
    /** Sets the template for the legend */
    tooltipLegendTemplate?: TRolloverLegendSvgTemplate | string;
    /** Sets the legend X offset */
    tooltipLegendOffsetX?: number;
    /** Sets the legend Y offset */
    tooltipLegendOffsetY?: number;
    /** Sets the tooltipDataTemplate, which allows to customize content for the tooltip */
    tooltipDataTemplate?: TRolloverTooltipDataTemplate | string;
    /** Sets whether to show the tooltip. Default true */
    showTooltip?: boolean;
    /** Sets if tooltips for multiple series are allowed to overlap.  Default false  */
    allowTooltipOverlapping?: boolean;
    /**
     * If True the {@link RolloverModifier} line snaps to
     * the nearest data-point of the first visible renderable series
     */
    snapToDataPoint?: boolean;
    /** Sets the parent div element id for the Tooltip */
    placementDivId?: string;
    /**
     * If this is set greater than the default of zero, the toolip will only show values for points in this radius, rather than all points on the vertical line
     */
    hitTestRadius?: number;
    /**
     * Sets if the axis label for the rollover Line should be shown. default false.
     * Customize this futher after the modifier has been created by setting properties on rolloverModifer.rolloverLineAnnotation
     */
    showAxisLabel?: boolean;
}

/**
 * The RolloverModifier provides tooltip and cursor behavior on a 2D {@link SciChartSurface}
 * within SciChart - High Performance {@link https://www.scichart.com/javascript-chart-features | JavaScript Charts}
 * @remarks
 *
 * To apply the RolloverModifier to a {@link SciChartSurface} and add tooltip behavior,
 * use the following code:
 *
 * ```ts
 * const sciChartSurface: SciChartSurface;
 * sciChartSurface.chartModifiers.add(new RolloverModifier());
 * ```
 */
export class RolloverModifier extends ChartModifierBase2D implements IIncludeSeries, IRolloverModifier {
    public readonly type = EChart2DModifierType.Rollover;
    /**
     * Gets or sets the template for the legend
     */
    public tooltipLegendTemplate?: TRolloverLegendSvgTemplate;
    /**
     * Gets or sets the legend X offset
     */
    public tooltipLegendOffsetX: number = 0;
    /**
     * Gets or sets the legend Y offset
     */
    public tooltipLegendOffsetY: number = 0;
    /**
     * Gets or sets the snapToDataPoint flag. If True the {@link RolloverModifier} line snaps to
     * the nearest data-point of the first visible renderable series
     */
    public snapToDataPoint: boolean = false;
    /**
     * If this is set greater than the default of zero, the toolip will only show values for points in this radius, rather than all points on the vertical line
     */
    public hitTestRadius: number = 0;

    protected showRolloverLineProperty: boolean = true;
    protected showTooltipProperty: boolean = true;
    protected absoluteXCoord = 0;

    public readonly rolloverLineAnnotation: LineAnnotation | undefined;
    protected mousePosition: EMousePosition = EMousePosition.OutOfCanvas;
    protected readonly legendAnnotation: RolloverLegendSvgAnnotation | undefined;
    private tooltipDataTemplateProperty?: TRolloverTooltipDataTemplate | undefined;
    private allowTooltipOverlappingProperty: boolean = false;
    private includedSeriesMap = new Map<IRenderableSeries, boolean>();
    private placementDivIdProperty: string | undefined;

    /**
     * Creates an instance of the RolloverModifier
     * @param options Optional parameters {@link IRolloverModifierOptions} used to configure the modifier
     */
    public constructor(options?: IRolloverModifierOptions) {
        super(options);
        this.hitTestRenderableSeries = this.hitTestRenderableSeries.bind(this);
        this.placementDivIdProperty = options?.placementDivId ?? this.placementDivIdProperty;

        this.rolloverLineAnnotation = this.createLine(options);

        if (options?.tooltipLegendTemplate) {
            if (typeof options.tooltipLegendTemplate === "string") {
                this.typeMap.set("tooltipLegendTemplate", options.tooltipLegendTemplate);
                options.tooltipLegendTemplate = getFunction(
                    EBaseType.OptionFunction,
                    options.tooltipLegendTemplate
                ) as TRolloverLegendSvgTemplate;
            }
        }

        this.tooltipLegendTemplate =
            (options?.tooltipLegendTemplate as TRolloverLegendSvgTemplate) ?? this.tooltipLegendTemplate;
        this.tooltipLegendOffsetX = options?.tooltipLegendOffsetX ?? this.tooltipLegendOffsetX;
        this.tooltipLegendOffsetY = options?.tooltipLegendOffsetY ?? this.tooltipLegendOffsetY;
        if (options?.tooltipDataTemplate) {
            if (typeof options.tooltipDataTemplate === "string") {
                this.typeMap.set("tooltipDataTemplate", options.tooltipDataTemplate);
                options.tooltipDataTemplate = getFunction(
                    EBaseType.OptionFunction,
                    options.tooltipDataTemplate
                ) as TRolloverTooltipDataTemplate;
            }
        }
        this.tooltipDataTemplateProperty =
            (options?.tooltipDataTemplate as TRolloverTooltipDataTemplate) ?? this.tooltipDataTemplateProperty;
        this.showRolloverLineProperty = options?.showRolloverLine ?? this.showRolloverLineProperty;
        this.showTooltipProperty = options?.showTooltip ?? this.showTooltipProperty;
        this.legendAnnotation = new RolloverLegendSvgAnnotation({
            tooltipLegendTemplate: this.tooltipLegendTemplate,
            tooltipLegendOffsetX: this.tooltipLegendOffsetX,
            tooltipLegendOffsetY: this.tooltipLegendOffsetY,
            xAxisId: this.xAxisId,
            yAxisId: this.yAxisId
        });
        this.allowTooltipOverlappingProperty = options?.allowTooltipOverlapping ?? this.allowTooltipOverlappingProperty;
        this.snapToDataPoint = options?.snapToDataPoint ?? this.snapToDataPoint;
        this.hitTestRadius = options?.hitTestRadius ?? this.hitTestRadius;
    }

    protected createLine(options?: IRolloverModifierOptions) {
        return new LineAnnotation({
            xCoordinateMode: ECoordinateMode.Pixel,
            yCoordinateMode: ECoordinateMode.Pixel,
            strokeDashArray: options?.rolloverLineStrokeDashArray,
            strokeThickness: options?.rolloverLineStrokeThickness ?? 2,
            stroke: options?.rolloverLineStroke ?? SciChartSurfaceBase.DEFAULT_THEME.cursorLineBrush,
            xAxisId: this.xAxisId,
            yAxisId: this.yAxisId,
            showLabel: options?.showAxisLabel ?? false
        });
    }
    /**
     * @inheritDoc
     */
    public applyTheme(themeProvider: IThemeProvider): void {
        if (this.parentSurface) {
            const previousThemeProvider = this.parentSurface.previousThemeProvider;
            if (this.rolloverLineAnnotation.stroke === previousThemeProvider.cursorLineBrush) {
                this.rolloverLineAnnotation.stroke = themeProvider.cursorLineBrush;
            }
        }
    }

    /** Gets or Sets the color of the vertical rollover line as an html color code */
    public get rolloverLineStroke(): string {
        return this.rolloverLineAnnotation.stroke;
    }
    /** Gets or Sets the color of the vertical rollover line as an html color code */
    public set rolloverLineStroke(rolloverLineStroke: string) {
        this.rolloverLineAnnotation.stroke = rolloverLineStroke;
        this.notifyPropertyChanged(PROPERTY.STROKE);
    }
    /** Gets or Sets the thickness of the vertical rollover line */
    public get rolloverLineStrokeThickness(): number {
        return this.rolloverLineAnnotation.strokeThickness;
    }
    /** Gets or Sets the thickness of the vertical rollover line */
    public set rolloverLineStrokeThickness(rolloverLineStrokeThickness: number) {
        this.rolloverLineAnnotation.strokeThickness = rolloverLineStrokeThickness;
        this.notifyPropertyChanged(PROPERTY.STROKE_THICKNESS);
    }
    /** Gets or Sets the dash array of the vertical rollover line */
    public get rolloverLineStrokeDashArray(): number[] {
        return this.rolloverLineAnnotation.strokeDashArray;
    }
    /** Gets or Sets the dash array of the vertical rollover line */
    public set rolloverLineStrokeDashArray(rolloverLineStrokeDashArray: number[]) {
        this.rolloverLineAnnotation.strokeDashArray = rolloverLineStrokeDashArray;
        this.notifyPropertyChanged(PROPERTY.STROKE_DASH_ARRAY);
    }

    /** Gets or Sets whether to show the vertical rollover line. Default true */
    public get showRolloverLine(): boolean {
        return this.showRolloverLineProperty;
    }

    /** Gets or Sets whether to show the vertical rollover line. Default true */
    public set showRolloverLine(showRolloverLine: boolean) {
        this.showRolloverLineProperty = showRolloverLine;
        this.notifyPropertyChanged(PROPERTY.SHOW_ROLLOVER_LINE);
    }

    /** Gets or Sets the tooltipDataTemplate, which allows you to customize content for the tooltip */
    public get tooltipDataTemplate(): TRolloverTooltipDataTemplate {
        return this.tooltipDataTemplateProperty;
    }

    /** Gets or Sets the tooltipDataTemplate, which allows you to customize content for the tooltip */
    public set tooltipDataTemplate(value: TRolloverTooltipDataTemplate) {
        this.tooltipDataTemplateProperty = value;
        this.notifyPropertyChanged(PROPERTY.TOOLTIP_DATA_TEMPLATE);
    }

    /** Gets or Sets whether to show the tooltip. Default true */
    public get showTooltip(): boolean {
        return this.showTooltipProperty;
    }
    /** Gets or Sets whether to show the tooltip. Default true */
    public set showTooltip(value: boolean) {
        this.showTooltipProperty = value;
        this.notifyPropertyChanged(PROPERTY.SHOW_TOOLTIP);
    }

    /** Gets or Sets if tooltips for multiple series are allowed to overlap.  Default false  */
    public get allowTooltipOverlapping(): boolean {
        return this.allowTooltipOverlappingProperty;
    }
    /** Gets or Sets if tooltips for multiple series are allowed to overlap.  Default false  */
    public set allowTooltipOverlapping(value: boolean) {
        this.allowTooltipOverlappingProperty = value;
        this.notifyPropertyChanged(PROPERTY.ALLOW_TOOLTIP_OVERLAPPING);
    }
    /**
     * @inheritDoc
     */
    public onAttach(): void {
        super.onAttach();
        this.addLineAnnotationToSurface();

        this.parentSurface.modifierAnnotations.add(this.legendAnnotation);
        this.getIncludedRenderableSeries().forEach(rs => this.addSeriesAnnotationsToParentSurface(rs));
    }

    protected addLineAnnotationToSurface() {
        this.parentSurface.modifierAnnotations.add(this.rolloverLineAnnotation);
    }
    /**
     * @inheritDoc
     */
    public onDetach(): void {
        super.onDetach();
        this.parentSurface.modifierAnnotations.remove(this.rolloverLineAnnotation, true);
        this.parentSurface.modifierAnnotations.remove(this.legendAnnotation);
        this.getIncludedRenderableSeries().forEach(rs => this.removeSeriesAnnotationsFromParentSurface(rs));
    }
    /**
     * @inheritDoc
     */
    public onAttachSeries(rs: IRenderableSeries): void {
        super.onAttachSeries(rs);
        this.addSeriesAnnotationsToParentSurface(rs);
        this.legendAnnotation.seriesInfos = this.getSeriesInfos();
    }
    /**
     * @inheritDoc
     */
    public onDetachSeries(rs: IRenderableSeries): void {
        super.onDetachSeries(rs);
        this.removeSeriesAnnotationsFromParentSurface(rs);
    }
    /**
     * @inheritDoc
     */
    public modifierMouseMove(args: ModifierMouseArgs): void {
        // If this is on a subchart, only respond to events from the active subchart
        if (this.parentSurface.isSubSurface && !args.isActiveSubChartEvent) return;
        this.activePointerEvents.set(args.pointerId, args);
        super.modifierMouseMove(args);
        let translatedMousePoint: Point;
        if (!this.mousePoint) {
            this.mousePosition = EMousePosition.OutOfCanvas;
        } else {
            translatedMousePoint = translateFromCanvasToSeriesViewRect(
                this.mousePoint,
                this.parentSurface.seriesViewRect
            );
            if (!translatedMousePoint) {
                this.mousePosition = EMousePosition.AxisArea;
            } else {
                this.mousePosition = EMousePosition.SeriesArea;
            }
        }

        const isActionAllowed = this.getIsActionAllowed(args);
        if (isActionAllowed) {
            this.update();
        }
    }
    /**
     * @inheritDoc
     */
    public modifierMouseLeave(args: ModifierMouseArgs): void {
        super.modifierMouseLeave(args);
        this.mousePosition = EMousePosition.OutOfCanvas;
        this.update();
    }
    /**
     * @inheritDoc
     */
    public onParentSurfaceRendered(): void {
        this.update();
    }
    /**
     * @inheritDoc
     */
    public includeSeries(series: IRenderableSeries, isIncluded: boolean): void {
        const valueChanged =
            (this.includedSeriesMap.get(series) === undefined && !isIncluded) ||
            (this.includedSeriesMap.get(series) === true && !isIncluded) ||
            (this.includedSeriesMap.get(series) === false && isIncluded);
        if (valueChanged) {
            this.includedSeriesMap.set(series, isIncluded);
            if (this.isAttached) {
                if (isIncluded === true) {
                    this.addSeriesAnnotationsToParentSurface(series);
                }
                if (isIncluded === false) {
                    this.removeSeriesAnnotationsFromParentSurface(series);
                }
                if (this.parentSurface) {
                    this.legendAnnotation.seriesInfos = this.getSeriesInfos();
                }
                this.parentSurface?.invalidateElement();
            }
        }
    }
    /**
     * @inheritDoc
     */
    public getIncludedRenderableSeries(): IRenderableSeries[] {
        const regularSeries = this.parentSurface.renderableSeries
            .asArray()
            .filter(
                rs =>
                    !rs.isStacked &&
                    rs.isVisible &&
                    rs.rolloverModifierProps.showRollover &&
                    this.testIsIncludedSeries(rs)
            );
        const stackedSeries = this.parentSurface.renderableSeries.asArray().filter(rs => rs.isStacked) as Array<
            BaseStackedCollection<any>
        >;
        const result: IRenderableSeries[] = regularSeries;
        stackedSeries.forEach(rs => {
            rs.getVisibleSeries().forEach(childRs => {
                if (childRs.rolloverModifierProps.showRollover && this.testIsIncludedSeries(childRs)) {
                    result.push(childRs);
                }
            });
        });
        return result;
    }

    /**
     * Override hitTestRenderableSeries and add a custom logic
     * @param rs
     * @param mousePoint
     */
    public hitTestRenderableSeries(rs: IRenderableSeries, mousePoint: Point): HitTestInfo {
        if (!mousePoint) {
            return undefined;
        }
        if (this.hitTestRadius <= 0) {
            return rs.hitTestProvider.hitTestXSlice(mousePoint.x, mousePoint.y);
        } else {
            return rs.hitTestProvider.hitTestDataPoint(mousePoint.x, mousePoint.y, this.hitTestRadius);
        }
    }
    /**
     * Returns current mouse position
     */
    public getMousePosition(): EMousePosition {
        return this.mousePosition;
    }
    /** @inheritDoc */
    public toJSON() {
        const json = super.toJSON();
        const options: RequiredOwnProps<IRolloverModifierOptions, IChartModifierBaseOptions> = {
            snapToDataPoint: this.snapToDataPoint,
            placementDivId: this.placementDivId,
            hitTestRadius: this.hitTestRadius,
            allowTooltipOverlapping: this.allowTooltipOverlapping,
            rolloverLineStrokeDashArray: this.rolloverLineStrokeDashArray,
            rolloverLineStroke: this.rolloverLineStroke,
            rolloverLineStrokeThickness: this.rolloverLineStrokeThickness,
            showRolloverLine: this.showRolloverLine,
            showTooltip: this.showTooltip,
            showAxisLabel: this.rolloverLineAnnotation?.showLabel ?? false,
            tooltipDataTemplate: this.typeMap.get("tooltipDataTemplate"),
            tooltipLegendOffsetX: this.tooltipLegendOffsetX,
            tooltipLegendOffsetY: this.tooltipLegendOffsetY,
            tooltipLegendTemplate: this.typeMap.get("tooltipLegendTemplate")
        };
        Object.assign(json.options, options);
        return json;
    }

    /**
     * Called internally to adjust the positions of tooltips if there are overlaps, or if it is a vertical chart
     * @param tooltipArray
     * @param allowTooltipOverlapping
     * @param spacing
     * @param seriesViewRect
     * @param pixelRatio
     * @param isVerticalChart
     * @returns TTooltipProps[]
     */
    protected CalculateTooltipPositions(
        tooltipArray: TTooltipProps[],
        allowTooltipOverlapping: boolean,
        spacing: number,
        seriesViewRect: Rect,
        pixelRatio: number,
        isVerticalChart: boolean = false
    ): TTooltipProps[] {
        return calcTooltipPositions(
            tooltipArray,
            allowTooltipOverlapping,
            spacing,
            seriesViewRect,
            pixelRatio,
            isVerticalChart
        );
    }

    /** @inheritDoc */
    protected notifyPropertyChanged(propertyName: string) {
        super.notifyPropertyChanged(propertyName);
        if (propertyName === PROPERTY.X_AXIS_ID) {
            this.rolloverLineAnnotation.xAxisId = this.xAxisId;
            this.legendAnnotation.xAxisId = this.xAxisId;
        }
        if (propertyName === PROPERTY.Y_AXIS_ID) {
            this.rolloverLineAnnotation.yAxisId = this.yAxisId;
            this.legendAnnotation.yAxisId = this.yAxisId;
        }
    }

    protected isVerticalChart() {
        const xAxis = this.parentSurface?.getXAxisById(this.xAxisId) || this.parentSurface?.xAxes.get(0);
        if (xAxis) {
            return xAxis.isVerticalChart;
        }
        return false;
    }

    protected removeSeriesAnnotationsFromParentSurface(rs: IRenderableSeries) {
        if (!this.parentSurface) return;
        if (rs.isStacked) {
            const stackedSeries = rs as BaseStackedCollection<BaseStackedRenderableSeries>;
            stackedSeries.asArray().forEach(childRs => {
                this.parentSurface.modifierAnnotations.remove(this.getRolloverProps(childRs).marker);
                this.parentSurface.modifierAnnotations.remove(this.getRolloverProps(childRs).tooltip);
                this.getRolloverProps(childRs).delete();
            });
        } else {
            this.parentSurface.modifierAnnotations.remove(this.getRolloverProps(rs).marker);
            this.parentSurface.modifierAnnotations.remove(this.getRolloverProps(rs).tooltip);
            this.getRolloverProps(rs).delete();
            if (rs.type === ESeriesType.BandSeries) {
                this.parentSurface.modifierAnnotations.remove(this.getRolloverProps1(rs).marker);
                this.parentSurface.modifierAnnotations.remove(this.getRolloverProps1(rs).tooltip);
                this.getRolloverProps1(rs).delete();
            }
        }
    }

    /**
     * @param rs
     */
    protected addSeriesAnnotationsToParentSurface(rs: IRenderableSeries) {
        if (
            !this.parentSurface ||
            rs.type === ESeriesType.StackedMountainCollection ||
            rs.type === ESeriesType.StackedColumnCollection
        ) {
            return;
        }
        this.getRolloverProps(rs).rolloverModifier = this;
        createAnnotations(rs, this.getRolloverProps(rs), this.getRolloverProps1(rs), this.placementDivIdProperty);
        const marker = this.getRolloverProps(rs).marker;
        if (!this.parentSurface.modifierAnnotations.contains(marker)) {
            this.parentSurface.modifierAnnotations.add(this.getRolloverProps(rs).marker);
            this.parentSurface.modifierAnnotations.add(this.getRolloverProps(rs).tooltip);
            if (rs.type === ESeriesType.BandSeries) {
                this.getRolloverProps1(rs).rolloverModifier = this;
                this.parentSurface.modifierAnnotations.add(this.getRolloverProps1(rs).marker);
                this.parentSurface.modifierAnnotations.add(this.getRolloverProps1(rs).tooltip);
            }
        }
    }

    protected getRolloverProps(rs: IRenderableSeries) {
        return rs.rolloverModifierProps;
    }

    protected getRolloverProps1(rs: IRenderableSeries) {
        return rs.rolloverModifierProps1;
    }

    protected update() {
        this.updateLine();
        this.updateSeriesAnnotations();
        if (this.tooltipLegendTemplate) {
            this.legendAnnotation.seriesInfos = this.getSeriesInfos();
        }
    }

    protected updateLine() {
        if (this.mousePosition !== EMousePosition.SeriesArea) {
            this.rolloverLineAnnotation.isHidden = true;
            return;
        }
        if (!this.showRolloverLineProperty) {
            this.rolloverLineAnnotation.isHidden = true;
            return;
        }
        if (this.snapToDataPoint) {
            const firstSeries = this.getIncludedRenderableSeries()[0];
            if (firstSeries) {
                const hitTestInfo = this.hitTestRenderableSeries(firstSeries, this.mousePoint);
                if (hitTestInfo && hitTestInfo.isWithinDataBounds) {
                    this.rolloverLineAnnotation.isHidden = false;
                    const x = translateToNotScaled(hitTestInfo.xCoord);
                    this.rolloverLineAnnotation.x1 = x;
                    this.rolloverLineAnnotation.x2 = x;
                    this.rolloverLineAnnotation.y1 = 0;
                    this.rolloverLineAnnotation.y2 = this.isVerticalChart()
                        ? translateToNotScaled(this.parentSurface.seriesViewRect.right)
                        : translateToNotScaled(this.parentSurface.seriesViewRect.bottom);
                } else {
                    this.rolloverLineAnnotation.isHidden = true;
                }
            } else {
                this.rolloverLineAnnotation.isHidden = true;
            }
        } else {
            this.rolloverLineAnnotation.isHidden = false;
            const translatedMousePoint = translateFromCanvasToSeriesViewRect(
                this.mousePoint,
                this.parentSurface.seriesViewRect
            );
            if (translatedMousePoint) {
                const x = translateToNotScaled(translatedMousePoint.x);
                const y = translateToNotScaled(translatedMousePoint.y);
                if (this.isVerticalChart()) {
                    this.rolloverLineAnnotation.x1 = y;
                    this.rolloverLineAnnotation.x2 = y;
                    this.rolloverLineAnnotation.y1 = 0;
                    this.rolloverLineAnnotation.y2 = translateToNotScaled(this.parentSurface.seriesViewRect.right);
                } else {
                    this.rolloverLineAnnotation.x1 = x;
                    this.rolloverLineAnnotation.x2 = x;
                    this.rolloverLineAnnotation.y1 = 0;
                    this.rolloverLineAnnotation.y2 = translateToNotScaled(this.parentSurface.seriesViewRect.bottom);
                }
            }
        }
    }

    /**
     * @description Update Markers and Tooltips
     */
    protected updateSeriesAnnotations() {
        const rsList = this.getIncludedRenderableSeries();

        rsList.forEach(rs => {
            const props = this.getRolloverProps(rs);
            if (!props.marker) {
                this.addSeriesAnnotationsToParentSurface(rs);
            }
            props.marker.suspendInvalidate();
            props.tooltip.suspendInvalidate();
            props.marker.isHidden = true;
            props.tooltip.isHidden = true;
            props.tooltip.x1 = undefined;
            props.tooltip.y1 = undefined;
            // TODO should be more general than looking at series type
            if (rs.type === ESeriesType.BandSeries) {
                props.marker.suspendInvalidate();
                props.tooltip.suspendInvalidate();
                props.marker.isHidden = true;
                props.tooltip.isHidden = true;
                props.tooltip.x1 = undefined;
                props.tooltip.y1 = undefined;
            }
        });
        if (this.mousePosition !== EMousePosition.SeriesArea) {
            rsList.forEach(rs => {
                const props = this.getRolloverProps(rs);

                props.marker.resumeInvalidate();
                props.tooltip.resumeInvalidate();
                if (rs.type === ESeriesType.BandSeries) {
                    // leave for now

                    this.getRolloverProps1(rs).marker.resumeInvalidate();
                    this.getRolloverProps1(rs).tooltip.resumeInvalidate();
                }
            });
            return;
        }
        const tooltipArray: TTooltipProps[] = [];
        const height = this.isVerticalChart()
            ? this.parentSurface.seriesViewRect.width
            : this.parentSurface.seriesViewRect.height;
        rsList.forEach((rs, index) => {
            const hitTestInfo = this.hitTestRenderableSeries(rs, this.mousePoint);
            if (hitTestInfo) {
                if ((rs.type !== ESeriesType.StackedColumnSeries && this.hitTestRadius === 0) || hitTestInfo.isHit) {
                    const isVisible = 0 <= hitTestInfo.yCoord && hitTestInfo.yCoord <= height;
                    if (isVisible) {
                        this.absoluteXCoord = this.isVerticalChart() ? hitTestInfo.yCoord : hitTestInfo.xCoord;
                        const absoluteYCoord = this.isVerticalChart() ? hitTestInfo.xCoord : hitTestInfo.yCoord;
                        const tooltipProps = calcTooltipProps(
                            index,
                            rs,
                            this.getRolloverProps(rs),
                            this.parentSurface.seriesViewRect,
                            hitTestInfo.xValue,
                            hitTestInfo.yValue,
                            this.absoluteXCoord,
                            absoluteYCoord,
                            hitTestInfo,
                            DpiHelper.PIXEL_RATIO,
                            false,
                            this.isVerticalChart()
                        );
                        if (tooltipProps) tooltipArray.push(tooltipProps);
                    }
                }
                if (rs.type === ESeriesType.BandSeries) {
                    const isVisibleY1 = 0 <= hitTestInfo.y1Coord && hitTestInfo.y1Coord <= height;
                    if (isVisibleY1) {
                        const absoluteXCoord = this.isVerticalChart() ? hitTestInfo.y1Coord : hitTestInfo.xCoord;
                        const absoluteYCoord = this.isVerticalChart() ? hitTestInfo.xCoord : hitTestInfo.y1Coord;
                        const tooltipY1Props = calcTooltipProps(
                            index,
                            rs,
                            this.getRolloverProps1(rs),
                            this.parentSurface.seriesViewRect,
                            hitTestInfo.xValue,
                            hitTestInfo.y1Value,
                            absoluteXCoord,
                            absoluteYCoord,
                            hitTestInfo,
                            DpiHelper.PIXEL_RATIO,
                            true,
                            this.isVerticalChart()
                        );
                        if (tooltipY1Props) tooltipArray.push(tooltipY1Props);
                    }
                }
            }
        });
        let orderedTooltipArray: TTooltipProps[];
        if (this.isVerticalChart()) {
            orderedTooltipArray = tooltipArray.sort((a, b) => (a.xCoord > b.xCoord ? 1 : b.xCoord > a.xCoord ? -1 : 0));
        } else {
            orderedTooltipArray = tooltipArray.sort((a, b) => (a.yCoord > b.yCoord ? 1 : b.yCoord > a.yCoord ? -1 : 0));
        }
        const tooltipPositions = this.CalculateTooltipPositions(
            orderedTooltipArray,
            this.allowTooltipOverlapping,
            TOOLTIP_SPACING * DpiHelper.PIXEL_RATIO,
            this.parentSurface.seriesViewRect,
            DpiHelper.PIXEL_RATIO,
            this.isVerticalChart()
        );
        tooltipPositions.forEach(el => {
            const rs = rsList[el.index];
            const showTooltip = this.showTooltip && el.seriesInfo.isHit;
            const showMarker = el.seriesInfo.isHit;
            if (el.isY1) {
                updateRolloverModifierProps(
                    this.getRolloverProps1(rs),
                    rs,
                    el,
                    showTooltip,
                    showMarker,
                    this.placementDivId
                );
            } else {
                updateRolloverModifierProps(
                    this.getRolloverProps(rs),
                    rs,
                    el,
                    showTooltip,
                    showMarker,
                    this.placementDivId
                );
            }
        });

        rsList.forEach(rs => {
            this.getRolloverProps(rs).marker.resumeInvalidate();
            this.getRolloverProps(rs).tooltip.resumeInvalidate();
            if (rs.type === ESeriesType.BandSeries) {
                this.getRolloverProps1(rs).marker.resumeInvalidate();
                this.getRolloverProps1(rs).tooltip.resumeInvalidate();
            }
        });
    }

    /**
     * Test if the series is included or excluded, by default it is included
     * @param series
     * @private
     */
    private testIsIncludedSeries(series: IRenderableSeries): boolean {
        return this.includedSeriesMap.get(series) !== false;
    }

    protected getSeriesInfos(): SeriesInfo[] {
        return this.getIncludedRenderableSeries()
            .map(rs => {
                const hitTestInfo = this.hitTestRenderableSeries(rs, this.mousePoint);
                if (!hitTestInfo) {
                    return undefined;
                }
                return rs.getSeriesInfo(hitTestInfo);
            })
            .filter(rs => rs !== undefined);
    }

    /**
     * Gets or sets the parent div element reference or id for the Tooltip
     */
    public get placementDivId() {
        return this.placementDivIdProperty;
    }
    /**
     * Gets or sets the parent div element reference or id for the Tooltip
     */
    public set placementDivId(value) {
        if (this.placementDivIdProperty !== value) {
            this.placementDivIdProperty = value;
            this.parentSurface?.renderableSeries.asArray().forEach((rs: IRenderableSeries) => {
                this.getRolloverProps(rs).tooltip.placementDivId = this.placementDivIdProperty;
                this.getRolloverProps1(rs).tooltip.placementDivId = this.placementDivIdProperty;
            });
        }
    }
}

/**
 * @ignore
 * @description Used internally, calculates tooltip props
 * @param index
 * @param rs
 * @param rolloverProps
 * @param seriesViewRect
 * @param xValue
 * @param yValue
 * @param absoluteXCoord
 * @param absoluteYCoord
 * @param hitTestInfo
 * @param pixelRatio
 * @param isY1
 */
export const calcTooltipProps = (
    index: number,
    rs: IRenderableSeries,
    rolloverProps: RolloverModifierRenderableSeriesProps,
    seriesViewRect: Rect,
    xValue: number,
    yValue: number,
    absoluteXCoord: number,
    absoluteYCoord: number,
    hitTestInfo: HitTestInfo,
    pixelRatio: number,
    isY1: boolean = false,
    isVerticalChart: boolean = false
) => {
    // This check is done in calling code
    // const visibleRange = rs.yAxis.visibleRange;
    // const isVisible = visibleRange.min <= yValue && yValue <= visibleRange.max);
    // if (isVisible) {
    const seriesInfo = rs.getSeriesInfo(hitTestInfo);
    const width = rolloverProps.tooltip.width;
    const scaledWidth = width * pixelRatio;
    const height = rolloverProps.tooltip.height;
    const scaledHeight = height * pixelRatio;
    const distTop = absoluteYCoord;
    const distBottom = seriesViewRect.height - absoluteYCoord;
    const defaultVerticalShift = 5 * pixelRatio;
    const xCoordShift = seriesViewRect.width - absoluteXCoord < scaledWidth ? -width : 5;
    let yCoordShift = isVerticalChart ? defaultVerticalShift : -height / 2;
    if (isVerticalChart) {
        if (distBottom < scaledHeight + defaultVerticalShift) {
            yCoordShift = ((scaledHeight + defaultVerticalShift) / pixelRatio) * -1;
        }
    } else {
        if (distTop < scaledHeight / 2) {
            yCoordShift = -distTop / pixelRatio;
        } else if (distBottom < scaledHeight / 2) {
            yCoordShift = -(scaledHeight - distBottom) / pixelRatio;
        }
    }
    const newRecord: TTooltipProps = {
        index,
        isY1,
        xValue,
        yValue,
        xCoord: absoluteXCoord,
        yCoord: absoluteYCoord,
        hitTestPointValues: hitTestInfo.hitTestPointValues,
        isCategoryAxis: hitTestInfo.isCategoryAxis,
        xCoordShift,
        yCoordShift,
        height: scaledHeight,
        width: scaledWidth,
        seriesInfo
    };
    return newRecord;
    // }
    // return undefined;
};

/**
 * @ignore
 * @description Used internally, calculates tooltip positions to avoid overlapping
 * @param tooltipArray
 * @param allowTooltipOverlapping
 * @param spacing
 * @param seriesViewRect
 * @param pixelRatio
 * @param isVerticalChart
 */
export const calcTooltipPositions = (
    tooltipArray: TTooltipProps[],
    allowTooltipOverlapping: boolean,
    spacing: number,
    seriesViewRect: Rect,
    pixelRatio: number,
    isVerticalChart: boolean = false
): TTooltipProps[] => {
    const positionProperties: TPositionPoperties = getTooltipPositionProperties(isVerticalChart);
    // centering for vertical charts
    if (isVerticalChart) {
        tooltipArray.forEach((tooltip: TTooltipProps) => {
            const halfWidth = tooltip.width / 2 / pixelRatio;
            if (tooltip.xCoord > halfWidth) {
                tooltip[positionProperties.shiftPropertyName] = -(tooltip.width / 2) / pixelRatio;
            }
        });
    }
    const hasOverlap: boolean = checkHasOverlap(tooltipArray, spacing, pixelRatio, positionProperties);
    const length: number = tooltipArray.length;
    if (!allowTooltipOverlapping && length >= 2 && hasOverlap) {
        const clusters = splitIntoClusters(tooltipArray, spacing, pixelRatio, positionProperties);
        
        clusters.forEach(cluster => {
            if (cluster.length >= 2) {
                const spreadMap = spreadTooltips(
                    cluster,
                    pixelRatio,
                    positionProperties,
                    spacing,
                    seriesViewRect
                );
                cluster.forEach(tooltip => {
                    tooltip[positionProperties.shiftPropertyName] = spreadMap.get(tooltip.index);
                });
            }
        });
    }

    return tooltipArray;
};

/**
 * @description Used internally, helps with overlapping tooltips
 * @param tooltipArray 
 * @param spacing 
 * @param pixelRatio 
 * @param positionProperties 
 * @returns 
 */
export const splitIntoClusters = (
    tooltipArray: TTooltipProps[],
    spacing: number,
    pixelRatio: number,
    positionProperties: TPositionPoperties
): TTooltipProps[][] => {
    const sorted = [...tooltipArray].sort((a, b) => a[positionProperties.coordPropertyName] - b[positionProperties.coordPropertyName]);
    const clusters: TTooltipProps[][] = [];
    let cluster: TTooltipProps[] = [];

    for (const tooltip of sorted) {
        if (cluster.length === 0) {
            cluster.push(tooltip);
        } else {
            const last = cluster[cluster.length - 1];
            const lastEnd = getEndPoint(
                last[positionProperties.coordPropertyName],
                last[positionProperties.shiftPropertyName],
                pixelRatio,
                last[positionProperties.sizePropertyName]
            );
            const currentStart = getStartPoint(
                tooltip[positionProperties.coordPropertyName],
                tooltip[positionProperties.shiftPropertyName],
                pixelRatio
            );

            if (currentStart < lastEnd + spacing / pixelRatio) {
                cluster.push(tooltip);
            } else {
                clusters.push(cluster);
                cluster = [tooltip];
            }
        }
    }

    if (cluster.length > 0) clusters.push(cluster);
    return clusters;
};

/**
 * @ignore
 * @description Creates MarkerAnnotation and TooltipAnnotation and assigns to rolloverSeries properties
 * @param rs RenderableSeries
 */
const createAnnotations = (
    rs: IRenderableSeries,
    rolloverModifierProps: RolloverModifierRenderableSeriesProps,
    rolloverModifierProps1: RolloverModifierRenderableSeriesProps,
    placementDivId?: string
) => {
    if (!rolloverModifierProps.marker) {
        rolloverModifierProps.marker = new RolloverMarkerSvgAnnotation(rolloverModifierProps);
        rolloverModifierProps.marker.xAxisId = rs.xAxisId;
        rolloverModifierProps.marker.yAxisId = rs.yAxisId;
    }
    if (!rolloverModifierProps.tooltip) {
        rolloverModifierProps.tooltipTitle = rolloverModifierProps.tooltipTitle ?? rs.getDataSeriesName() ?? "";
        rolloverModifierProps.tooltipColor = rolloverModifierProps.tooltipColor;
        rolloverModifierProps.shadowColor = rs.parentSurface.themeProvider.shadowEffectColor;
        rolloverModifierProps.tooltip = new RolloverTooltipSvgAnnotation(rolloverModifierProps, {
            seriesType: rs.type,
            placementDivId
        });
        rolloverModifierProps.tooltip.xAxisId = rs.xAxisId;
        rolloverModifierProps.tooltip.yAxisId = rs.yAxisId;
    }

    if (rs.type === ESeriesType.BandSeries) {
        const bandRs = rs as FastBandRenderableSeries;
        if (!rolloverModifierProps1.marker) {
            rolloverModifierProps1.marker = new RolloverMarkerSvgAnnotation(rolloverModifierProps1);
            rolloverModifierProps1.marker.xAxisId = bandRs.xAxisId;
            rolloverModifierProps1.marker.yAxisId = bandRs.yAxisId;
        }
        if (!rolloverModifierProps1.tooltip) {
            rolloverModifierProps1.tooltipTitle =
                rolloverModifierProps1.tooltipTitle ?? bandRs.getDataSeriesName() ?? "";
            rolloverModifierProps1.tooltipColor = rolloverModifierProps1.tooltipColor;
            rolloverModifierProps1.tooltip = new RolloverTooltipSvgAnnotation(rolloverModifierProps1, {
                placementDivId
            });
            rolloverModifierProps1.tooltip.xAxisId = bandRs.xAxisId;
            rolloverModifierProps1.tooltip.yAxisId = bandRs.yAxisId;
        }
    }
};

/** @ignore */
export const updateRolloverModifierProps = (
    rolloverRSProps: RolloverModifierRenderableSeriesProps,
    rs: IRenderableSeries,
    tooltipProps: TTooltipProps,
    showTooltip: boolean,
    showMarker: boolean,
    placementDivId?: string
) => {
    rolloverRSProps.tooltip.seriesInfo = tooltipProps.seriesInfo;
    if (tooltipProps.isY1) {
        (rolloverRSProps.tooltip.seriesInfo as XyySeriesInfo).isFirstSeries = false;
    }
    if (showMarker) {
        rolloverRSProps.marker.isHidden = false;
        rolloverRSProps.marker.x1 = tooltipProps.xValue;
        rolloverRSProps.marker.y1 = tooltipProps.yValue;
        if (rolloverRSProps.markerColor.startsWith(AUTO_COLOR)) {
            rolloverRSProps.markerColor = tooltipProps.isY1 ? (rs as FastBandRenderableSeries).strokeY1 : rs.stroke;
        }
    }
    // Update tooltips
    if (showTooltip) {
        rolloverRSProps.tooltip.isHidden = false;
        rolloverRSProps.tooltip.x1 = tooltipProps.xValue;
        rolloverRSProps.tooltip.y1 = tooltipProps.yValue;
        rolloverRSProps.tooltip.xCoordShift = tooltipProps.xCoordShift;
        rolloverRSProps.tooltip.yCoordShift = tooltipProps.yCoordShift;
        if (rolloverRSProps.tooltipColor.startsWith(AUTO_COLOR)) {
            rolloverRSProps.tooltipColor = tooltipProps.isY1 ? (rs as FastBandRenderableSeries).strokeY1 : rs.stroke;
        }
    } else {
        if (placementDivId) {
            rolloverRSProps.tooltip.delete();
        }
    }
};
