const { useState } = React;

function App() {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [recipe, setRecipe] = useState(null);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState(0);
    const [progressMessage, setProgressMessage] = useState("");
    const [currentStep, setCurrentStep] = useState("ingredients");
    const [servings, setServings] = useState(4);
    const [originalServings, setOriginalServings] = useState(4);

    // No demo recipe - this is the full working version!

    async function convertRecipe() {
        if (!url.trim() || !isValidUrl(url)) {
            setError("Please enter a valid recipe URL");
            return;
        }
        
        setLoading(true);
        setError("");
        setRecipe(null);
        setCurrentStep("ingredients");
        setProgress(0);

        const updateProgress = (percent, message) => {
            setProgress(percent);
            setProgressMessage(message);
        };

        try {
            updateProgress(25, "Fetching recipe...");
            
            const response = await fetch("/.netlify/functions/convert-recipe", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ url })
            });

            updateProgress(60, "Converting to TM6...");

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            const data = await response.json();
            updateProgress(85, "Finalizing...");
            
            let text = data.content?.map(b => b.text || "").join(" ") || "";
            
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                text = jsonMatch[0];
            }
            
            const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
            
            if (!parsed.name || !parsed.ingredients || !parsed.steps) {
                throw new Error("Invalid recipe format");
            }
            
            setOriginalServings(parsed.servings || 4);
            setServings(parsed.servings || 4);
            updateProgress(100, "Complete!");
            
            setTimeout(() => {
                setRecipe(parsed);
                setLoading(false);
            }, 300);
            
        } catch (e) {
            setLoading(false);
            console.error("Error:", e);
            setError("Failed to convert recipe. Please check the URL and try again, or make sure your API key is configured correctly.");
        }
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    const updateServings = (newServings) => {
        setServings(newServings);
    };

    const getScaledAmount = (originalAmount) => {
        if (!originalAmount || isNaN(originalAmount)) return originalAmount;
        const ratio = servings / originalServings;
        const scaled = originalAmount * ratio;
        return scaled % 1 === 0 ? scaled : Math.round(scaled * 10) / 10;
    };

    return (
        <div style={{
            minHeight: "100vh",
            background: "#f8f9fa",
            color: "#212529"
        }}>
            {/* Header */}
            <header style={{
                background: "white",
                borderBottom: "1px solid #dee2e6",
                padding: "16px 0"
            }}>
                <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                            <div style={{
                                width: 40, height: 40,
                                background: "#28a745",
                                borderRadius: 8,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 18, color: "white", fontWeight: 700
                            }}>
                                TM
                            </div>
                            <h1 style={{ 
                                margin: 0, fontSize: 20, fontWeight: 600, color: "#212529"
                            }}>
                                Recipe Converter
                            </h1>
                        </div>
                        {recipe && (
                            <button 
                                onClick={() => { setRecipe(null); setUrl(""); setError(""); }}
                                style={{
                                    padding: "8px 16px",
                                    background: "#f8f9fa",
                                    border: "1px solid #dee2e6",
                                    borderRadius: 20,
                                    color: "#6c757d",
                                    fontSize: 14,
                                    cursor: "pointer"
                                }}
                            >
                                New Recipe
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="main-container" style={{ maxWidth: 800, margin: "0 auto", padding: "20px" }}>
                
                {/* Input Section */}
                {!recipe && !loading && (
                    <div className="fade-in" style={{
                        background: "white",
                        borderRadius: 12,
                        padding: 40,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                        textAlign: "center"
                    }}>
                        <h2 style={{ 
                            margin: "0 0 12px", fontSize: 24, fontWeight: 600, color: "#212529"
                        }}>
                            Convert Recipe for Thermomix
                        </h2>
                        <p style={{ 
                            margin: "0 0 32px", fontSize: 16, color: "#6c757d"
                        }}>
                            Enter any recipe URL to get step-by-step Thermomix instructions
                        </p>

                        <div style={{ maxWidth: 500, margin: "0 auto" }}>
                            <div className="input-group" style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                                <input
                                    type="url"
                                    value={url}
                                    onChange={e => setUrl(e.target.value)}
                                    onKeyPress={e => e.key === 'Enter' && convertRecipe()}
                                    placeholder="Paste any recipe URL here..."
                                    style={{
                                        flex: 1,
                                        padding: "14px 16px",
                                        border: "1px solid #ced4da",
                                        borderRadius: 8,
                                        fontSize: 16
                                    }}
                                />
                                <button 
                                    onClick={convertRecipe} 
                                    disabled={!url.trim()}
                                    style={{
                                        padding: "14px 24px",
                                        background: url.trim() ? "#28a745" : "#e9ecef",
                                        border: "none",
                                        borderRadius: 8,
                                        color: url.trim() ? "white" : "#6c757d",
                                        fontSize: 16,
                                        fontWeight: 600,
                                        cursor: url.trim() ? "pointer" : "not-allowed"
                                    }}
                                >
                                    Convert
                                </button>
                            </div>

                            {error && (
                                <div style={{ 
                                    padding: "12px 16px", 
                                    background: "#f8d7da", 
                                    border: "1px solid #f5c6cb", 
                                    borderRadius: 6, 
                                    color: "#721c24", 
                                    fontSize: 14
                                }}>
                                    {error}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ textAlign: "center", padding: "60px 0" }}>
                        <div style={{
                            width: 40, height: 40,
                            border: "4px solid #e9ecef",
                            borderTop: "4px solid #28a745",
                            borderRadius: "50%",
                            animation: "spin 1s linear infinite",
                            margin: "0 auto 20px"
                        }} />
                        
                        <div style={{
                            width: "240px",
                            height: 4,
                            background: "#e9ecef",
                            borderRadius: 2,
                            margin: "0 auto 12px"
                        }}>
                            <div style={{
                                width: `${progress}%`,
                                height: "100%",
                                background: "#28a745",
                                borderRadius: 2,
                                transition: "width 0.3s ease"
                            }} />
                        </div>
                        
                        <p style={{ margin: 0, fontSize: 14, color: "#6c757d" }}>
                            {progressMessage}
                        </p>
                    </div>
                )}

                {/* Recipe Interface */}
                {recipe && (
                    <div className="fade-in">
                        {/* Recipe Header */}
                        <div style={{
                            background: "white",
                            borderRadius: 12,
                            padding: 24,
                            marginBottom: 16,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                        }}>
                            <h1 style={{ 
                                margin: "0 0 8px", fontSize: 24, fontWeight: 600, color: "#212529"
                            }}>
                                {recipe.name}
                            </h1>
                            <p style={{ margin: "0 0 16px", fontSize: 16, color: "#6c757d" }}>
                                {recipe.description}
                            </p>
                            
                            <div style={{ display: "flex", gap: 16, fontSize: 14, color: "#6c757d" }}>
                                <span>Prep: {recipe.prepTime}</span>
                                <span>Total: {recipe.totalTime}</span>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div style={{
                            display: "flex",
                            background: "white",
                            borderRadius: 12,
                            padding: 4,
                            marginBottom: 16,
                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                        }}>
                            <button
                                onClick={() => setCurrentStep("ingredients")}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    background: currentStep === "ingredients" ? "#28a745" : "transparent",
                                    color: currentStep === "ingredients" ? "white" : "#6c757d",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Ingredients
                            </button>
                            <button
                                onClick={() => setCurrentStep("steps")}
                                style={{
                                    flex: 1,
                                    padding: "12px 16px",
                                    background: currentStep === "steps" ? "#28a745" : "transparent",
                                    color: currentStep === "steps" ? "white" : "#6c757d",
                                    border: "none",
                                    borderRadius: 8,
                                    fontSize: 16,
                                    fontWeight: 600,
                                    cursor: "pointer"
                                }}
                            >
                                Instructions
                            </button>
                        </div>

                        {/* Ingredients View */}
                        {currentStep === "ingredients" && (
                            <div style={{
                                background: "white",
                                borderRadius: 12,
                                padding: 24,
                                boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                            }}>
                                {/* Servings Adjuster */}
                                <div style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 24,
                                    padding: 16,
                                    background: "#f8f9fa",
                                    borderRadius: 8
                                }}>
                                    <span style={{ fontSize: 16, fontWeight: 500 }}>Servings</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                        <button
                                            onClick={() => updateServings(Math.max(1, servings - 1))}
                                            style={{
                                                width: 32, height: 32,
                                                background: "#e9ecef",
                                                border: "none",
                                                borderRadius: "50%",
                                                cursor: "pointer",
                                                fontSize: 16
                                            }}
                                        >
                                            -
                                        </button>
                                        <span style={{ 
                                            fontSize: 18, fontWeight: 600, minWidth: 40, textAlign: "center" 
                                        }}>
                                            {servings}
                                        </span>
                                        <button
                                            onClick={() => updateServings(servings + 1)}
                                            style={{
                                                width: 32, height: 32,
                                                background: "#e9ecef",
                                                border: "none",
                                                borderRadius: "50%",
                                                cursor: "pointer",
                                                fontSize: 16
                                            }}
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>

                                {/* Ingredients List */}
                                <div style={{ display: "grid", gap: 12 }}>
                                    {recipe.ingredients?.map((ing, i) => (
                                        <div key={i} style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            padding: "12px 16px",
                                            background: "#f8f9fa",
                                            borderRadius: 8,
                                            border: "1px solid #e9ecef"
                                        }}>
                                            <span style={{ fontSize: 16, color: "#212529" }}>{ing.item}</span>
                                            <span style={{ 
                                                fontSize: 16, fontWeight: 600, color: "#28a745" 
                                            }}>
                                                {getScaledAmount(ing.amount)}{ing.unit ? ` ${ing.unit}` : ""}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentStep("steps")}
                                    style={{
                                        width: "100%",
                                        padding: "16px",
                                        background: "#28a745",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 8,
                                        fontSize: 16,
                                        fontWeight: 600,
                                        marginTop: 24,
                                        cursor: "pointer"
                                    }}
                                >
                                    Start Cooking →
                                </button>
                            </div>
                        )}

                        {/* Steps View */}
                        {currentStep === "steps" && (
                            <div style={{ display: "grid", gap: 16 }}>
                                {recipe.steps?.map((step, i) => {
                                    const s = step.settings || {};
                                    return (
                                        <div key={i} style={{
                                            background: "white",
                                            borderRadius: 12,
                                            padding: 24,
                                            boxShadow: "0 2px 10px rgba(0,0,0,0.1)"
                                        }}>
                                            {/* Step Header */}
                                            <div style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 16,
                                                marginBottom: 16
                                            }}>
                                                <div style={{
                                                    width: 32, height: 32,
                                                    background: "#28a745",
                                                    color: "white",
                                                    borderRadius: 8,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    fontSize: 16,
                                                    fontWeight: 600
                                                }}>
                                                    {step.stepNumber}
                                                </div>
                                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: "#212529" }}>
                                                    {step.title}
                                                </h3>
                                            </div>
                                            
                                            <p style={{ 
                                                fontSize: 16, color: "#495057", lineHeight: 1.5, margin: "0 0 16px"
                                            }}>
                                                {step.instruction}
                                            </p>
                                            
                                            {/* Settings */}
                                            <div className="settings-grid" style={{ 
                                                display: "grid", 
                                                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", 
                                                gap: 12,
                                                marginBottom: step.note ? 16 : 0
                                            }}>
                                                {s.speed && (
                                                    <div style={{
                                                        textAlign: "center",
                                                        padding: "12px",
                                                        background: "#f8f9fa",
                                                        borderRadius: 8,
                                                        border: "1px solid #e9ecef"
                                                    }}>
                                                        <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>SPEED</div>
                                                        <div style={{ fontSize: 18, fontWeight: 600, color: "#212529" }}>{s.speed}</div>
                                                    </div>
                                                )}
                                                {s.temp && s.temp !== "—" && (
                                                    <div style={{
                                                        textAlign: "center",
                                                        padding: "12px",
                                                        background: "#f8f9fa",
                                                        borderRadius: 8,
                                                        border: "1px solid #e9ecef"
                                                    }}>
                                                        <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>TEMP</div>
                                                        <div style={{ fontSize: 18, fontWeight: 600, color: "#212529" }}>{s.temp}°C</div>
                                                    </div>
                                                )}
                                                {s.time && (
                                                    <div style={{
                                                        textAlign: "center",
                                                        padding: "12px",
                                                        background: "#f8f9fa",
                                                        borderRadius: 8,
                                                        border: "1px solid #e9ecef"
                                                    }}>
                                                        <div style={{ fontSize: 12, color: "#6c757d", marginBottom: 4 }}>TIME</div>
                                                        <div style={{ fontSize: 18, fontWeight: 600, color: "#212529" }}>{s.time}</div>
                                                    </div>
                                                )}
                                                {s.mc === false && (
                                                    <div style={{
                                                        textAlign: "center",
                                                        padding: "12px",
                                                        background: "#fff3cd",
                                                        borderRadius: 8,
                                                        border: "1px solid #ffeaa7"
                                                    }}>
                                                        <div style={{ fontSize: 12, color: "#856404", marginBottom: 4 }}>MC</div>
                                                        <div style={{ fontSize: 14, fontWeight: 600, color: "#856404" }}>Remove</div>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {step.note && (
                                                <div style={{
                                                    padding: 12,
                                                    background: "#e8f5e8",
                                                    borderRadius: 8,
                                                    fontSize: 14,
                                                    color: "#155724",
                                                    fontStyle: "italic"
                                                }}>
                                                    {step.note}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Tips */}
                                {recipe.tips?.length > 0 && (
                                    <div style={{
                                        background: "#fff3cd",
                                        borderRadius: 12,
                                        padding: 20,
                                        border: "1px solid #ffeaa7"
                                    }}>
                                        <h4 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 600, color: "#856404" }}>
                                            Pro Tips
                                        </h4>
                                        {recipe.tips.map((tip, i) => (
                                            <div key={i} style={{ 
                                                fontSize: 14, color: "#856404", marginBottom: 6, lineHeight: 1.4
                                            }}>
                                                • {tip}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

ReactDOM.render(React.createElement(App), document.getElementById('root'));
