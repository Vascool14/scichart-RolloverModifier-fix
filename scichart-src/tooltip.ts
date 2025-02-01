import { Point, Rect, SeriesInfo } from "scichart";

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

export enum ESize {
    width = "width",
    height = "height"
}

export enum ECoord {
    xCoord = "xCoord",
    yCoord = "yCoord"
}

export enum EShift {
    xCoordShift = "xCoordShift",
    yCoordShift = "yCoordShift"
}

type TSize = ESize.width | ESize.height;
type TCoord = ECoord.xCoord | ECoord.yCoord;
type TShift = EShift.xCoordShift | EShift.yCoordShift;

export type TPositionPoperties = {
    sizePropertyName: TSize;
    coordPropertyName: TCoord;
    shiftPropertyName: TShift;
};

/** @ignore */
export const spreadTooltips = (
    tooltipArray: TTooltipProps[],
    pixelRatio: number,
    positionProperties: TPositionPoperties,
    spacing: number,
    seriesViewRect: Rect
): Map<number, number> => {
    const shiftMap: Map<number, number> = new Map();
    const length: number = tooltipArray.length;
    const totalSize: number = getTotalSize(tooltipArray, positionProperties.sizePropertyName);
    const totalSpacing: number = getTotalSpacing(tooltipArray, spacing);
    const totalBoxModel: number = totalSize + totalSpacing;

    const firstTooltip: TTooltipProps = tooltipArray[0];
    const lastTooltip: TTooltipProps = tooltipArray[length - 1];

    let startPoint: number = getStartPoint(
        firstTooltip[positionProperties.coordPropertyName],
        firstTooltip[positionProperties.shiftPropertyName],
        pixelRatio
    );
    let endPoint: number = getEndPoint(
        lastTooltip[positionProperties.coordPropertyName],
        lastTooltip[positionProperties.shiftPropertyName],
        pixelRatio,
        lastTooltip[positionProperties.sizePropertyName]
    );

    const updatedPoints: { start: number; end: number } = getUpdatedPoints(
        startPoint,
        endPoint,
        totalBoxModel,
        seriesViewRect[positionProperties.sizePropertyName]
    );

    startPoint = updatedPoints.start;
    endPoint = updatedPoints.end;

    const currentPadding = (endPoint - startPoint - totalSize) / (tooltipArray.length - 1);

    tooltipArray.reduce((tooltipTopCoord: number, tooltip: TTooltipProps) => {
        shiftMap.set(tooltip.index, (tooltipTopCoord - tooltip[positionProperties.coordPropertyName]) / pixelRatio);
        return tooltipTopCoord + tooltip[positionProperties.sizePropertyName] + currentPadding;
    }, startPoint);

    return shiftMap;
};

/** @ignore */
export const checkHasOverlap = (
    tooltipArray: TTooltipProps[],
    spacing: number,
    pixelRatio: number,
    positionProperties: TPositionPoperties
): boolean => {
    const length: number = tooltipArray.length;
    for (let i = 0; i < length - 1; i++) {
        const currentTooltip: TTooltipProps = tooltipArray[i];
        const currentTooltipEndPoint: number =
            currentTooltip[positionProperties.coordPropertyName] +
            currentTooltip[positionProperties.sizePropertyName] +
            currentTooltip[positionProperties.shiftPropertyName] * pixelRatio;

        const nextTooltip: TTooltipProps = tooltipArray[i + 1];
        const nextTooltipStartPoint =
            nextTooltip[positionProperties.coordPropertyName] +
            nextTooltip[positionProperties.shiftPropertyName] * pixelRatio;

        const diff: number = nextTooltipStartPoint - currentTooltipEndPoint;
        if (diff < spacing) return true;
    }
    return false;
};

/** @ignore */
export const getTotalSize = (tooltipArray: TTooltipProps[], sizePropertyName: TSize): number =>
    tooltipArray.reduce((acc: number, tooltip: TTooltipProps) => {
        const size = tooltip[sizePropertyName];
        return typeof size === "number" ? acc + size : acc;
    }, 0);

/** @ignore */
export const getTotalSpacing = (tooltipArray: TTooltipProps[], spacing: number): number =>
    (tooltipArray.length - 1) * spacing;

/** @ignore */
export const getStartPoint = (coord: number, shift: number, pixelRatio: number): number => coord + shift * pixelRatio;

/** @ignore */
export const getEndPoint = (coord: number, shift: number, pixelRatio: number, size: number): number =>
    coord + shift * pixelRatio + size;

/** @ignore */
export const getUpdatedPoints = (
    startPoint: number,
    endPoint: number,
    totalBoxModel: number,
    size: number
): { start: number; end: number } => {
    const additionalWidth: number = totalBoxModel - (endPoint - startPoint);
    const additionalWidthHalf: number = additionalWidth / 2;

    const availableWidthFromStart = startPoint;
    const availableWidthFromEnd = size - endPoint;

    let start = startPoint - additionalWidthHalf;
    let end = endPoint + additionalWidthHalf;

    if (availableWidthFromStart < additionalWidthHalf) {
        start = 0;
        end = endPoint + (additionalWidth - availableWidthFromStart);
    }

    if (availableWidthFromEnd < additionalWidthHalf) {
        start = startPoint - (additionalWidth - availableWidthFromEnd);
        end = size;
    }
    return {
        start,
        end
    };
};

/** @ignore */
export const getTooltipPositionProperties = (isVerticalChart: boolean): TPositionPoperties => {
    if (isVerticalChart) {
        return {
            sizePropertyName: ESize.width,
            coordPropertyName: ECoord.xCoord,
            shiftPropertyName: EShift.xCoordShift
        };
    } else {
        return {
            sizePropertyName: ESize.height,
            coordPropertyName: ECoord.yCoord,
            shiftPropertyName: EShift.yCoordShift
        };
    }
};
