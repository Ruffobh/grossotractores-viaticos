
const apiKey = "AIzaSyB79RTu4XwusFpPPAD6L1UZYoYEkQfL2PQ";


async function testRest() { // List Models
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log("Listing Models via REST...");

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    });


    if (response.ok) {
        const data = await response.json();
        console.log("✅ LIST MODELS SUCCESS!");
        if (data.models) {
            console.log("--- Gemini 1.5 Models ---");
            data.models.forEach(m => {
                if (m.name.includes("gemini-1.5")) {
                    console.log(m.name);
                }
            });
            console.log("--- Gemini Flash Models ---");
            data.models.forEach(m => {
                if (m.name.includes("flash")) {
                    console.log(m.name);
                }
            });
        } else {
            console.log("No models found.");
        }
    } else {

        console.log("❌ LIST MODELS FAILED");
        console.log("Status:", response.status);
        console.log("Text:", await response.text());
    }
}


testRest();
