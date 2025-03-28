const fs = require('fs');
const pdfParse = require('pdf-parse');
const axios = require('axios');
const readline = require('readline');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PDF_PATH = "test.pdf";

// Function to extract URLs from text
function extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

// Function to calculate total experience from work history
function calculateTotalExperience(workExperience) {
    let totalYears = 0;
    if (Array.isArray(workExperience)) {
        workExperience.forEach(exp => {
            const duration = exp.Duration || '';
            const years = duration.match(/(\d+)\s*years?/i);
            const months = duration.match(/(\d+)\s*months?/i);
            
            if (years) totalYears += parseInt(years[1]);
            if (months) totalYears += parseInt(months[1]) / 12;
        });
    }
    return Math.round(totalYears * 10) / 10; // Round to 1 decimal place
}

// Function to get notice period from user
async function getNoticePeriod() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Please enter candidate\'s notice period (in days): ', (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// Function to call Gemini API for structured data extraction
async function getStructuredDataFromGemini(text) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" + GEMINI_API_KEY;

    const prompt = `
        Extract structured information from the following resume and return it in JSON format:
        - Full Name
        - Contact Information (Phone, Email, LinkedIn, Address)
        - Skills (as an array)
        - Education (Degree, University, Year)
        - Work Experience (as an array of objects with Company, Role, Duration including years/months)
        - Projects (Title, Description, Technologies Used)
        - Certifications
        
        Resume Text:
        """${text}"""
        
        Return only valid JSON output, without any additional text or explanations.
    `;

    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        let reply = response.data.candidates[0].content.parts[0].text;
        
        // **Fix:** Remove unwanted markdown formatting (` ```json ... ``` `)
        reply = reply.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(reply); // Now safe to parse
    } catch (error) {
        console.error("Error fetching data from Gemini API:", error.response ? error.response.data : error.message);
        return null;
    }
}

// Function to extract text from the PDF
async function extractTextFromPDF(pdfPath) {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
}

// Add new function to score resume using Gemini
async function scoreResumeWithGemini(resumeData, jobRequirements) {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=" + GEMINI_API_KEY;

    const prompt = `
        You are an AI HR assistant. Score this candidate's resume based on the job requirements.
        Score each factor strictly out of 100 points. The final score will be the average.

        Job Requirements:
        ${JSON.stringify(jobRequirements, null, 2)}

        Candidate's Resume Data:
        ${JSON.stringify(resumeData, null, 2)}

        Score these factors strictly, considering exact matches and relevance:

        1. Skills Match (0-100):
        - Give points based on exact matches with required skills
        - Consider relevance and proficiency level
        - Deduct points for missing critical skills
        
        2. Experience Score (0-100):
        - Compare years of experience with requirement
        - Evaluate relevance of past roles
        - Consider industry-specific experience
        
        3. Education Match (0-100):
        - Score based on degree relevance
        - Consider university tier
        - Additional certifications
        
        4. Notice Period Score (0-100):
        - 100 points if notice period matches requirement
        - Deduct points proportionally for longer notice periods
        - Consider immediate joiners if preferred
        
        5. Overall Profile Score (0-100):
        - Project relevance
        - Industry alignment
        - Additional achievements
        
        Return only valid JSON in this format:
        {
            "breakdown": {
                "skills_score": number (0-100),
                "experience_score": number (0-100),
                "education_score": number (0-100),
                "notice_period_score": number (0-100),
                "overall_profile_score": number (0-100)
            },
            "final_score": number (average of all scores),
            "detailed_reasoning": {
                "skills_analysis": string,
                "experience_analysis": string,
                "education_analysis": string,
                "notice_period_analysis": string,
                "overall_analysis": string
            }
        }
    `;

    try {
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: prompt }] }]
        });

        let reply = response.data.candidates[0].content.parts[0].text;
        reply = reply.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(reply);
        
        // Ensure final score is average of all scores
        const scores = Object.values(result.breakdown);
        result.final_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        
        return result;
    } catch (error) {
        console.error("Error in AI scoring:", error);
        return null;
    }
}

// Main function
async function parseResume() {
    try {
        console.log("Extracting text from resume...");
        const text = await extractTextFromPDF(PDF_PATH);
        
        // Extract links
        const links = extractLinks(text);
        console.log("Extracted Links:", links);

        console.log("Parsing resume with Gemini AI...");
        const structuredData = await getStructuredDataFromGemini(text);

        if (structuredData) {
            // Calculate total experience
            const totalExperience = calculateTotalExperience(structuredData["Work Experience"]);
            structuredData["Total Experience Years"] = totalExperience;

            // Get notice period from user
            const noticePeriod = await getNoticePeriod();
            structuredData["Notice Period"] = noticePeriod;

            structuredData["Links"] = links; // Add extracted links to JSON output

            // Load HR requirements and get AI score
            const hrRequirements = JSON.parse(fs.readFileSync("demo_req_hr.json", "utf-8"));
            console.log("Scoring resume with AI...");
            const aiScore = await scoreResumeWithGemini(structuredData, hrRequirements.job_posting);

            const result = {
                parsed_data: structuredData,
                ai_evaluation: aiScore
            };

            // Create directory if it doesn't exist
            if (!fs.existsSync('output_scrape')) {
                fs.mkdirSync('output_scrape');
            }

            // Save files with candidate name
            const candidateName = structuredData["Full Name"].replace(/\s+/g, '_');
            fs.writeFileSync(
                `output_scrape/${candidateName}_parsed.json`, 
                JSON.stringify(structuredData, null, 2)
            );
            fs.writeFileSync(
                `output_scrape/${candidateName}_evaluation.json`, 
                JSON.stringify(result, null, 2)
            );
            
            console.log(`Resume data saved for ${structuredData["Full Name"]}`);
            console.log('\nScore Breakdown:');
            console.log('---------------');
            console.log(`Skills Match: ${aiScore.breakdown.skills_score}/100`);
            console.log(`Experience: ${aiScore.breakdown.experience_score}/100`);
            console.log(`Education: ${aiScore.breakdown.education_score}/100`);
            console.log(`Notice Period: ${aiScore.breakdown.notice_period_score}/100`);
            console.log(`Overall Profile: ${aiScore.breakdown.overall_profile_score}/100`);
            console.log('---------------');
            console.log(`Final Score: ${aiScore.final_score}/100`);
        } else {
            console.log("Failed to extract structured data.");
        }
    } catch (error) {
        console.error("Error processing resume:", error);
    }
}

parseResume();
