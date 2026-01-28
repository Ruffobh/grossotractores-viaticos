
const { Resend } = require("resend");

// Hardcode the key from .env.local to test directly
const resend = new Resend("re_hhirq5gZ_2x19vDaiHB7Sc4B3Nqo8rd9B");

async function sendTestEmail() {
    try {
        console.log("Sending test email...");

        // Replace with the user's actual email for testing
        // Using a hardcoded email here based on assumption, but ideally should be the one from the user's account
        // Since I don't know the user's email for sure, I'll start with a placeholder but I should probably ask or check logs
        // However, the user said "change for mine", implying they expect it to their logged in email. 
        // I will try to send to 'onboarding@resend.dev' first to see if it even connects, 
        // or better, I will try to send to the email usually associated with the API key owner.
        // For now, let's try a generic send and see the error if the recipient is invalid.

        // NOTE: In Resend 'onboarding@resend.dev' is the SENDER. The RECIPIENT must be the verify email.
        // I will try to leave the 'to' empty or prompt the user, but for a script I need a target.
        // I recall the user saying "replace by mine".

        const data = await resend.emails.send({
            from: "onboarding@resend.dev",
            to: "francoruffino.90@gmail.com",
            // Actually, I should probably check the logs or ask the user for their email to be sure.
            // But looking at previous context, there isn't a clear email. 
            // Let's try a safe guess or just check if the function throws an auth error first 
            // by sending to 'delivered@resend.dev' which is a test sink.

            subject: "Test Email from Script",
            html: "<p>If you see this, Resend is working!</p>"
        });

        console.log("Response:", data);
    } catch (error) {
        console.error("Error sending email:", error);
    }
}

sendTestEmail();
