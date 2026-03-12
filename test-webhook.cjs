const simulatedPayload = {
    ref: "refs/heads/main",
    repository: {
        id: 123456,
        name: "trust-layer-core",
        full_name: "commitly/trust-layer-core",
        html_url: "https://github.com/commitly/trust-layer-core"
    },
    commits: [
        {
            id: "abc123456",
            message: "Refactored UI components\n\n- Updated buttons\n- Added animations",
            url: "https://github.com/commitly/trust-layer-core/commit/abc123456",
            author: {
                name: "John Developer",
                email: "john@example.com",
                username: "johndev"
            }
        },
        {
            id: "def987654",
            message: "feat: Implement Login UI",
            url: "https://github.com/commitly/trust-layer-core/commit/def987654",
            author: {
                name: "John Developer",
                email: "john@example.com",
                username: "johndev"
            }
        }
    ]
};

async function runTest() {
    try {
        console.log("Sending simulated GitHub push webhook to localhost...");
        const response = await fetch("http://localhost:3000/api/github/webhook", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-github-event": "push",
                "x-hub-signature-256": "sha256=MOCK_SIGNATURE"
            },
            body: JSON.stringify(simulatedPayload)
        });

        const data = await response.json();
        console.log(`Status: ${response.status}`);
        console.log(`Response:`, data);
    } catch (err) {
        console.error("Test failed:", err);
    }
}

runTest();
