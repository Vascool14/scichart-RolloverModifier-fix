import { SciChartSurface } from "scichart";
import { LeftAlignedOuterVerticallyStackedAxisLayoutStrategy } from "scichart";
import { NumericAxis } from "scichart";
import { StackedColumnCollection } from "scichart";
import { StackedColumnRenderableSeries } from "scichart";
import { XyDataSeries } from "scichart";
import { EAxisAlignment } from "scichart";
import { NumberRange } from "scichart";

// switch comments on these lines to see the past error within RolloverModifier and the Fix
// import { RolloverModifier } from "../scichart-src/RolloverModifier";
import { RolloverModifier } from "scichart"; 

export async function drawExample1(divElementId: string) {
    const AXES_COUNT = 3;
    const { wasmContext, sciChartSurface } = await SciChartSurface.create(divElementId);

    sciChartSurface.layoutManager.leftOuterAxesLayoutStrategy
        = new LeftAlignedOuterVerticallyStackedAxisLayoutStrategy();

    // Create an XAxis on the bottom
    sciChartSurface.xAxes.add(new NumericAxis(wasmContext, {
        axisTitle: "X Axis",
        axisTitleStyle: { fontSize: 13 },
        backgroundColor: "#50C7E022",
        axisBorder: { color: "#50C7E0", borderTop: 1 }
    }));

    // Create several YAxis on the left
    for(let i = 1; i <= AXES_COUNT; i++) {
        sciChartSurface.yAxes.add(new NumericAxis(wasmContext, { 
            id: `YAxis${i}`, 
            axisTitle: `Y Axis ${i}`, 
            axisAlignment: EAxisAlignment.Left 
        }));
    }

    // To make it clearer what's happening, colour the axis backgrounds & borders
    const axisColors = ["#EC0F6C", "#30BC9A", "#F48420", "#4B4B9C", "#FFA07A", "#FFD700", "#20B2AA", "#778899", "#FF6347", "#40E0D0", "#EE82EE", "#B0C4DE", "#FF00FF", "#FF4500", "#FFD700", "#FF6347", "#40E0D0", "#EE82EE", "#B0C4DE", "#FF00FF", "#FF4500"];
    sciChartSurface.yAxes.asArray().forEach((yAxis: any, index: number) => {
        yAxis.backgroundColor = axisColors[index] + "22";
        yAxis.axisBorder = { color: axisColors[index], borderRight: 1 };
        yAxis.axisTitleStyle.fontSize = 13;
    });

    // Let's add some series to the chart to show how they also behave with axis
    const getOptions = (index: number, collectionIndex: number) => {
        const xValues = Array.from(Array(50).keys());
        const yValues = xValues.map(x => Math.random() + x);
    
        return {
            yAxisId: `YAxis${index}`,
            stroke: axisColors[index-1] + "FF",
            fill: axisColors[index-1] + (collectionIndex == 0 ? "88" : "00"),
            strokeThickness: 2,
            dataSeries: new XyDataSeries(wasmContext, {xValues, yValues })
        };
    };

    for(let i = 1; i <= AXES_COUNT; i++) {
        const collection = new StackedColumnCollection(wasmContext, {
            yAxisId: `YAxis${i}`,
            dataPointWidth: 1
        });

        collection.add(
            new StackedColumnRenderableSeries(wasmContext, {...getOptions(i, 0)}),
            new StackedColumnRenderableSeries(wasmContext, {...getOptions(i, 1)}),
        )

        sciChartSurface.renderableSeries.add(collection);
    }

    sciChartSurface.chartModifiers.add(

        new RolloverModifier({
            yAxisId: "YAxis1",
            // allowTooltipOverlapping: true,
            rolloverLineStroke: "#FFF",
            rolloverLineStrokeThickness: 2
        })
    );  
};

export async function drawExample2(divElementId: string) {
    const { wasmContext, sciChartSurface } = await SciChartSurface.create(divElementId);

    // add x y axis
    sciChartSurface.xAxes.add(new NumericAxis(wasmContext));
    sciChartSurface.yAxes.add(new NumericAxis(wasmContext, { growBy: new NumberRange(1, 1) }));

    const collection = new StackedColumnCollection(wasmContext);

    collection.add(
        new StackedColumnRenderableSeries(wasmContext, {
            dataSeries: new XyDataSeries(wasmContext, { xValues: [1, 2, 3, 4], yValues: [1, 2, 1, 2] }),
            stroke: "red",
            fill: "#ff000088"
        }),
        new StackedColumnRenderableSeries(wasmContext, {
            dataSeries: new XyDataSeries(wasmContext, { xValues: [1, 2, 3, 4], yValues: [1, 0.5, 0.5, 1] }),
            stroke: "blue",
            fill: "#0000ff88"
        }), 
        new StackedColumnRenderableSeries(wasmContext, {
            dataSeries: new XyDataSeries(wasmContext, { xValues: [1, 2, 3, 4], yValues: [10, 20, 20, 15] }),
            stroke: "green",
            fill: "#00ff8888"
        }),
    )

    sciChartSurface.renderableSeries.add(collection);

    sciChartSurface.chartModifiers.add(
        new RolloverModifier({
            // allowTooltipOverlapping: true,
            rolloverLineStroke: "#FFF",
            rolloverLineStrokeThickness: 2
        })
    );  
}