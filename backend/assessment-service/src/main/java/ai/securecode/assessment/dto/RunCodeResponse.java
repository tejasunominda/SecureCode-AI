package ai.securecode.assessment.dto;

import java.util.List;

public record RunCodeResponse(
        int visiblePassed,
        int visibleTotal,
        int hiddenPassed,
        int hiddenTotal,
        List<TestCaseResult> visibleResults,
        List<TestCaseResult> hiddenResults,
        boolean allVisiblePassed,
        boolean allHiddenPassed
) {
    public record TestCaseResult(
            String input,
            String expectedOutput,
            String actualOutput,
            boolean passed,
            long runtimeMs
    ) {}
}
