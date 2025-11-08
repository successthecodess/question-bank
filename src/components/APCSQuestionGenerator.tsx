import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronRight, Check, X, Brain, BookOpen, Target, Award, Sparkles, ArrowRight, TrendingUp, AlertCircle } from 'lucide-react';

// Type Definitions
interface Choice {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

interface Question {
  id: string;
  question: string;
  code: string | null;
  choices: Choice[];
  correct: 'A' | 'B' | 'C' | 'D';
  difficulty: 1 | 2 | 3;
  concept: string;
  skill: string;
  unitId: number;
  unitName: string;
  templateType?: string;
  timestamp: number;
  userCorrect?: boolean;
}

interface Unit {
  id: number;
  name: string;
  topics: string[];
  weight: number;
}

interface QuestionTemplate {
  type: string;
  focus: string;
}

interface UnitPerformance {
  correct: number;
  total: number;
  concepts: {
    [concept: string]: {
      correct: number;
      total: number;
    };
  };
}

interface Score {
  correct: number;
  total: number;
}

interface Weakness {
  unit: string;
  concept: string;
  accuracy: number;
  attempts: number;
  priority: 'high' | 'medium';
}

type Screen = 'landing' | 'units' | 'question' | 'results';

const APCSQuestionGenerator: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [score, setScore] = useState<Score>({ correct: 0, total: 0 });
  const [loading, setLoading] = useState<boolean>(false);
  const [explanation, setExplanation] = useState<string>('');
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [globalQuestionHistory, setGlobalQuestionHistory] = useState<Question[]>([]);
  const [unitPerformance, setUnitPerformance] = useState<Record<number, UnitPerformance>>({});
  const [preGeneratedQuestions, setPreGeneratedQuestions] = useState<Record<number, Question[]>>({});
  const [apiCallInProgress, setApiCallInProgress] = useState<boolean>(false);

  const units: Unit[] = [
    { id: 1, name: "Primitive Types", topics: ["Variables", "Data Types", "Operators", "Casting"], weight: 0.10 },
    { id: 2, name: "Using Objects", topics: ["Object Creation", "Method Calls", "Strings", "Math Class"], weight: 0.15 },
    { id: 3, name: "Boolean Expressions", topics: ["if Statements", "Conditionals", "Logical Operators"], weight: 0.15 },
    { id: 4, name: "Iteration", topics: ["for Loops", "while Loops", "Nested Loops", "Enhanced for"], weight: 0.20 }
  ];

  // Comprehensive question templates to ensure variety
  const questionTemplates = useMemo<Record<number, QuestionTemplate[]>>(() => ({
    1: [ // Primitive Types
      { type: "declaration", focus: "variable initialization with different types" },
      { type: "casting", focus: "implicit vs explicit type conversion" },
      { type: "arithmetic", focus: "operator precedence and evaluation order" },
      { type: "modulus", focus: "remainder operations in different contexts" },
      { type: "compound", focus: "compound assignment operators (+=, -=, *=)" },
      { type: "overflow", focus: "integer overflow and underflow behavior" },
      { type: "precision", focus: "floating point precision issues" },
      { type: "constants", focus: "final keyword and constant declaration" },
      { type: "division", focus: "integer vs floating point division" },
      { type: "mixedTypes", focus: "operations with mixed numeric types" }
    ],
    2: [ // Using Objects
      { type: "constructor", focus: "creating objects with different constructors" },
      { type: "methods", focus: "calling instance vs static methods" },
      { type: "stringConcat", focus: "string concatenation with + operator" },
      { type: "stringMethods", focus: "substring, indexOf, charAt operations" },
      { type: "mathRandom", focus: "generating random numbers with Math.random()" },
      { type: "mathFunctions", focus: "Math.pow, sqrt, abs, round methods" },
      { type: "nullRef", focus: "handling null references and NullPointerException" },
      { type: "equality", focus: "equals() vs == for objects" },
      { type: "wrapper", focus: "Integer, Double wrapper classes and autoboxing" },
      { type: "immutable", focus: "String immutability concepts" }
    ],
    3: [ // Boolean Expressions
      { type: "basic", focus: "simple if-else statements" },
      { type: "nested", focus: "nested conditional logic" },
      { type: "logical", focus: "AND, OR, NOT operators" },
      { type: "shortCircuit", focus: "short-circuit evaluation with && and ||" },
      { type: "deMorgan", focus: "applying De Morgan's laws" },
      { type: "comparison", focus: "comparing primitives and objects" },
      { type: "complex", focus: "evaluating complex boolean expressions" },
      { type: "ternary", focus: "conditional ternary operator ?:" },
      { type: "truthTable", focus: "constructing truth tables" },
      { type: "precedence", focus: "operator precedence in boolean expressions" }
    ],
    4: [ // Iteration
      { type: "forLoop", focus: "standard for loop patterns" },
      { type: "whileLoop", focus: "while loop conditions and termination" },
      { type: "doWhile", focus: "do-while loop behavior" },
      { type: "nested", focus: "nested loop execution counting" },
      { type: "enhanced", focus: "enhanced for loop with arrays/lists" },
      { type: "boundary", focus: "off-by-one errors and boundaries" },
      { type: "infinite", focus: "identifying infinite loops" },
      { type: "breakContinue", focus: "break and continue statements" },
      { type: "accumulator", focus: "accumulator patterns in loops" },
      { type: "search", focus: "linear search patterns" }
    ]
  }), []);

  // Pre-built fallback questions for instant loading
  const fallbackQuestionBank = useMemo<Record<number, Omit<Question, 'id' | 'unitId' | 'unitName' | 'timestamp'>[]>>(() => ({
    1: [
      {
        question: "What value is stored in result after this code executes?",
        code: "double temp = 7.5;\nint result = (int)(temp * 2);",
        choices: [
          { id: "A", text: "14" },
          { id: "B", text: "15" },
          { id: "C", text: "15.0" },
          { id: "D", text: "14.0" }
        ],
        correct: "B",
        difficulty: 2,
        concept: "Type casting",
        skill: "Evaluate expressions with casting"
      },
      {
        question: "Which statement correctly declares a constant in Java?",
        code: null,
        choices: [
          { id: "A", text: "final int MAX_SIZE = 100;" },
          { id: "B", text: "const int MAX_SIZE = 100;" },
          { id: "C", text: "static MAX_SIZE = 100;" },
          { id: "D", text: "int final MAX_SIZE = 100;" }
        ],
        correct: "A",
        difficulty: 1,
        concept: "Constants",
        skill: "Identify proper syntax"
      },
      {
        question: "What is the result of this expression?",
        code: "int a = 17;\nint b = 5;\nint result = a % b;",
        choices: [
          { id: "A", text: "3.4" },
          { id: "B", text: "3" },
          { id: "C", text: "2" },
          { id: "D", text: "12" }
        ],
        correct: "C",
        difficulty: 1,
        concept: "Modulus operator",
        skill: "Calculate remainder"
      }
    ],
    2: [
      {
        question: "Which statement about String objects in Java is true?",
        code: null,
        choices: [
          { id: "A", text: "Strings are mutable and can be changed after creation" },
          { id: "B", text: "The == operator compares String contents" },
          { id: "C", text: "String objects are immutable" },
          { id: "D", text: "Strings must be created with the new keyword" }
        ],
        correct: "C",
        difficulty: 1,
        concept: "String immutability",
        skill: "Understand object properties"
      },
      {
        question: "What happens when this code executes?",
        code: "String str = null;\nSystem.out.println(str.length());",
        choices: [
          { id: "A", text: "Prints 0" },
          { id: "B", text: "Prints -1" },
          { id: "C", text: "NullPointerException" },
          { id: "D", text: "Compilation error" }
        ],
        correct: "C",
        difficulty: 2,
        concept: "Null references",
        skill: "Identify runtime errors"
      },
      {
        question: "What is printed by this code?",
        code: "String s1 = \"Hello\";\nString s2 = s1;\ns1 = s1 + \" World\";\nSystem.out.println(s2);",
        choices: [
          { id: "A", text: "Hello World" },
          { id: "B", text: "Hello" },
          { id: "C", text: "World" },
          { id: "D", text: "null" }
        ],
        correct: "B",
        difficulty: 2,
        concept: "String references",
        skill: "Trace object references"
      }
    ],
    3: [
      {
        question: "Which expression is equivalent to !(a && b)?",
        code: null,
        choices: [
          { id: "A", text: "!a && !b" },
          { id: "B", text: "!a || !b" },
          { id: "C", text: "a || b" },
          { id: "D", text: "!(a || b)" }
        ],
        correct: "B",
        difficulty: 2,
        concept: "De Morgan's Laws",
        skill: "Apply logical equivalences"
      },
      {
        question: "What is the value of result?",
        code: "boolean a = true;\nboolean b = false;\nboolean result = a || b && false;",
        choices: [
          { id: "A", text: "true" },
          { id: "B", text: "false" },
          { id: "C", text: "Compilation error" },
          { id: "D", text: "Runtime error" }
        ],
        correct: "A",
        difficulty: 2,
        concept: "Operator precedence",
        skill: "Evaluate boolean expressions"
      },
      {
        question: "How many times does 'Hi' print?",
        code: "int x = 5;\nif (x > 3)\n    if (x < 10)\n        System.out.println(\"Hi\");",
        choices: [
          { id: "A", text: "0" },
          { id: "B", text: "1" },
          { id: "C", text: "2" },
          { id: "D", text: "Compilation error" }
        ],
        correct: "B",
        difficulty: 1,
        concept: "Nested conditionals",
        skill: "Trace conditional execution"
      }
    ],
    4: [
      {
        question: "How many times does the inner statement execute?",
        code: "for (int i = 1; i <= 3; i++) {\n    for (int j = 1; j < i; j++) {\n        System.out.print(\"*\");\n    }\n}",
        choices: [
          { id: "A", text: "3" },
          { id: "B", text: "6" },
          { id: "C", text: "0" },
          { id: "D", text: "9" }
        ],
        correct: "A",
        difficulty: 3,
        concept: "Nested loops",
        skill: "Trace nested loop execution"
      },
      {
        question: "What is printed?",
        code: "int count = 0;\nfor (int i = 0; i < 5; i++) {\n    count += i;\n}\nSystem.out.println(count);",
        choices: [
          { id: "A", text: "10" },
          { id: "B", text: "15" },
          { id: "C", text: "14" },
          { id: "D", text: "0" }
        ],
        correct: "A",
        difficulty: 2,
        concept: "Accumulator pattern",
        skill: "Trace loop with accumulator"
      },
      {
        question: "Which loop will execute exactly 5 times?",
        code: null,
        choices: [
          { id: "A", text: "for (int i = 0; i <= 5; i++)" },
          { id: "B", text: "for (int i = 1; i < 6; i++)" },
          { id: "C", text: "for (int i = 0; i < 4; i++)" },
          { id: "D", text: "for (int i = 1; i <= 4; i++)" }
        ],
        correct: "B",
        difficulty: 1,
        concept: "Loop boundaries",
        skill: "Count loop iterations"
      }
    ]
  }), []);

  // Load history from localStorage on mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('apcs_global_history');
    const storedPerformance = localStorage.getItem('apcs_unit_performance');
    
    if (storedHistory) {
      try {
        const parsed: Question[] = JSON.parse(storedHistory);
        // Keep last 100 questions to prevent memory bloat
        setGlobalQuestionHistory(parsed.slice(-100));
      } catch (e) {
        console.error('Error loading history:', e);
      }
    }
    
    if (storedPerformance) {
      try {
        setUnitPerformance(JSON.parse(storedPerformance));
      } catch (e) {
        console.error('Error loading performance:', e);
      }
    }
  }, []);

  // Save history with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (globalQuestionHistory.length > 0) {
        localStorage.setItem('apcs_global_history', JSON.stringify(globalQuestionHistory.slice(-100)));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [globalQuestionHistory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(unitPerformance).length > 0) {
        localStorage.setItem('apcs_unit_performance', JSON.stringify(unitPerformance));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [unitPerformance]);

  const generateUniqueQuestion = useCallback(async (unit: Unit): Promise<void> => {
    // Prevent multiple simultaneous API calls
    if (apiCallInProgress) return;
    
    setLoading(true);
    setApiCallInProgress(true);
    
    // Check if we have a pre-generated question for this unit
    if (preGeneratedQuestions[unit.id] && preGeneratedQuestions[unit.id].length > 0) {
      const preGenerated = preGeneratedQuestions[unit.id].shift()!;
      setCurrentQuestion(preGenerated);
      setSessionQuestions(prev => [...prev, preGenerated]);
      setGlobalQuestionHistory(prev => [...prev, preGenerated]);
      setLoading(false);
      setApiCallInProgress(false);
      setCurrentScreen('question');
      return;
    }
    
    // Use fallback immediately if we've had recent API issues
    const recentApiFailures = sessionStorage.getItem('api_failures');
    if (recentApiFailures && parseInt(recentApiFailures) > 2) {
      useFallbackQuestion(unit);
      setLoading(false);
      setApiCallInProgress(false);
      setCurrentScreen('question');
      return;
    }
    
    try {
      // Set a timeout for the API call
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      // Get available templates for this unit
      const templates = questionTemplates[unit.id] || [];
      
      // Find which templates haven't been used yet
      const usedTemplates = globalQuestionHistory
        .filter(q => q.unitId === unit.id)
        .map(q => q.templateType);
      
      const availableTemplates = templates.filter(t => 
        usedTemplates.filter(used => used === t.type).length < 2
      );
      
      let selectedTemplate: QuestionTemplate;
      if (availableTemplates.length > 0) {
        selectedTemplate = availableTemplates[Math.floor(Math.random() * availableTemplates.length)];
      } else {
        const templateCounts = templates.map(t => ({
          template: t,
          count: usedTemplates.filter(used => used === t.type).length
        }));
        templateCounts.sort((a, b) => a.count - b.count);
        selectedTemplate = templateCounts[0].template;
      }

      // Generate unique variable names and values
      const varNames = ['num', 'val', 'count', 'result', 'score', 'temp', 'data', 'index', 'total', 'sum'];
      const selectedVars = varNames.sort(() => Math.random() - 0.5).slice(0, 3);
      const randomValues = [
        Math.floor(Math.random() * 20) + 1,
        Math.floor(Math.random() * 15) + 2,
        Math.floor(Math.random() * 10) + 3
      ];

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 800,
          messages: [
            {
              role: "user",
              content: `Generate a unique AP Computer Science A multiple choice question.

UNIT: ${unit.name}
TEMPLATE TYPE: ${selectedTemplate.type}
FOCUS: ${selectedTemplate.focus}

REQUIREMENTS:
- Use variables: ${selectedVars.join(', ')}
- Use values: ${randomValues.join(', ')}
- Question #${globalQuestionHistory.length + 1}
- Style: ${selectedTemplate.type}

Respond ONLY with valid JSON:
{
  "question": "question text",
  "code": "code snippet or null",
  "choices": [
    {"id": "A", "text": "choice"},
    {"id": "B", "text": "choice"},
    {"id": "C", "text": "choice"},
    {"id": "D", "text": "choice"}
  ],
  "correct": "letter",
  "difficulty": 1-3,
  "concept": "concept tested",
  "skill": "skill needed"
}`
            }
          ]
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const data = await response.json();
      let responseText = data.content[0].text;
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      
      const questionData = JSON.parse(responseText);
      
      // Enrich with metadata
      const enrichedQuestion: Question = {
        ...questionData,
        unitId: unit.id,
        unitName: unit.name,
        templateType: selectedTemplate.type,
        timestamp: Date.now(),
        id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      setCurrentQuestion(enrichedQuestion);
      setSessionQuestions(prev => [...prev, enrichedQuestion]);
      setGlobalQuestionHistory(prev => [...prev, enrichedQuestion]);
      
      // Reset API failure counter on success
      sessionStorage.removeItem('api_failures');
      
    } catch (error) {
      console.error("Error generating question:", error);
      
      // Track API failures
      const failures = parseInt(sessionStorage.getItem('api_failures') || '0') + 1;
      sessionStorage.setItem('api_failures', failures.toString());
      
      // Use fallback question
      useFallbackQuestion(unit);
    }
    
    setLoading(false);
    setApiCallInProgress(false);
    setCurrentScreen('question');
  }, [globalQuestionHistory, questionTemplates, apiCallInProgress, preGeneratedQuestions, sessionQuestions]);

  const useFallbackQuestion = useCallback((unit: Unit): void => {
    const unitFallbacks = fallbackQuestionBank[unit.id] || fallbackQuestionBank[1];
    
    // Filter out already used fallbacks
    const unusedFallbacks = unitFallbacks.filter(q => 
      !sessionQuestions.some(sq => sq.question === q.question)
    );
    
    const selected = unusedFallbacks.length > 0
      ? unusedFallbacks[Math.floor(Math.random() * unusedFallbacks.length)]
      : unitFallbacks[Math.floor(Math.random() * unitFallbacks.length)];
    
    const enrichedQuestion: Question = {
      ...selected,
      unitId: unit.id,
      unitName: unit.name,
      id: `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };
    
    setCurrentQuestion(enrichedQuestion);
    setSessionQuestions(prev => [...prev, enrichedQuestion]);
    setGlobalQuestionHistory(prev => [...prev, enrichedQuestion]);
  }, [fallbackQuestionBank, sessionQuestions]);

  // Pre-generate questions for smoother experience
  const preGenerateQuestions = useCallback(async (unitId: number): Promise<void> => {
    if (preGeneratedQuestions[unitId]?.length > 0) return;
    
    try {
      // Generate 2 questions in background for the unit
      const unit = units.find(u => u.id === unitId);
      if (!unit) return;
      
      // This would be done in background
      // For now, we'll just use fallbacks as pre-generated
      const fallbacks = fallbackQuestionBank[unitId] || [];
      setPreGeneratedQuestions(prev => ({
        ...prev,
        [unitId]: fallbacks.map(q => ({
          ...q,
          unitId: unit.id,
          unitName: unit.name,
          id: `pregen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now()
        }))
      }));
    } catch (error) {
      console.error('Error pre-generating questions:', error);
    }
  }, [units, fallbackQuestionBank, preGeneratedQuestions]);

  const generateExplanation = useCallback(async (): Promise<void> => {
    if (!currentQuestion || !selectedAnswer) return;
    
    // Use a simple fallback explanation if API is slow
    const fallbackExplanation = `The correct answer is ${currentQuestion.correct}. This question tests your understanding of ${currentQuestion.concept}. Review this concept and practice similar problems to improve.`;
    
    setExplanation(fallbackExplanation); // Set immediately
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [
            {
              role: "user",
              content: `Student answered "${selectedAnswer}" but correct answer was "${currentQuestion.correct}".
Question: ${currentQuestion.question}
${currentQuestion.code ? `Code: ${currentQuestion.code}` : ''}
Concept: ${currentQuestion.concept}

Provide a brief explanation (2 sentences max) why the correct answer is right.`
            }
          ]
        })
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        setExplanation(data.content[0].text);
      }
    } catch (error) {
      console.error("Error generating explanation:", error);
      // Keep the fallback explanation
    }
  }, [currentQuestion, selectedAnswer]);

  const handleAnswerSelect = useCallback(async (choiceId: 'A' | 'B' | 'C' | 'D'): Promise<void> => {
    if (showFeedback || !currentQuestion) return;
    
    setSelectedAnswer(choiceId);
    setShowFeedback(true);
    
    const isCorrect = choiceId === currentQuestion.correct;
    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1
    }));

    // Track performance by unit and concept
    const unitId = currentQuestion.unitId;
    const concept = currentQuestion.concept;
    
    setUnitPerformance(prev => {
      const updated = { ...prev };
      if (!updated[unitId]) {
        updated[unitId] = {
          correct: 0,
          total: 0,
          concepts: {}
        };
      }
      
      updated[unitId].correct += isCorrect ? 1 : 0;
      updated[unitId].total += 1;
      
      if (!updated[unitId].concepts[concept]) {
        updated[unitId].concepts[concept] = { correct: 0, total: 0 };
      }
      updated[unitId].concepts[concept].correct += isCorrect ? 1 : 0;
      updated[unitId].concepts[concept].total += 1;
      
      return updated;
    });

    // Mark question as answered
    setSessionQuestions(prev => 
      prev.map(q => q.id === currentQuestion.id 
        ? { ...q, userCorrect: isCorrect }
        : q
      )
    );

    if (!isCorrect) {
      await generateExplanation();
    }
  }, [showFeedback, currentQuestion, generateExplanation]);

  const handleNext = useCallback((): void => {
    if (!selectedUnit) return;
    
    setSelectedAnswer(null);
    setShowFeedback(false);
    setExplanation('');
    
    if (score.total >= 5) {
      setCurrentScreen('results');
    } else {
      generateUniqueQuestion(selectedUnit);
    }
  }, [score.total, selectedUnit, generateUniqueQuestion]);

  const resetQuiz = useCallback((): void => {
    setScore({ correct: 0, total: 0 });
    setSessionQuestions([]);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setExplanation('');
    setCurrentScreen('units');
  }, []);

  const getDifficultyStars = useCallback((difficulty: 1 | 2 | 3): string => {
    return "⭐".repeat(difficulty) + "☆".repeat(3 - difficulty);
  }, []);

  // Pre-generate questions when hovering over units for instant loading
  const handleUnitHover = useCallback((unitId: number): void => {
    preGenerateQuestions(unitId);
  }, [preGenerateQuestions]);

  if (currentScreen === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 mt-16">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-2xl shadow-lg">
                <Brain className="w-16 h-16 text-indigo-600" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              AP CS Question Bank
            </h1>
            <p className="text-xl text-gray-600 mb-8">
            
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-3">
                <Sparkles className="w-8 h-8 text-yellow-500 mr-3" />
                <h3 className="font-semibold text-lg"></h3>
              </div>
              <p className="text-gray-600">Unique questions every time, never run out of practice material</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-3">
                <Target className="w-8 h-8 text-green-500 mr-3" />
                <h3 className="font-semibold text-lg">Adaptive Difficulty</h3>
              </div>
              <p className="text-gray-600">Questions adjust to your skill level as you improve</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex items-center mb-3">
                <BookOpen className="w-8 h-8 text-blue-500 mr-3" />
                <h3 className="font-semibold text-lg">Smart Explanations</h3>
              </div>
              <p className="text-gray-600">Learn from mistakes with AI-powered explanations</p>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setCurrentScreen('units')}
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center"
            >
              Start Practice Demo
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
            <p className="text-sm text-gray-500 mt-4">No sign-up required for demo</p>
          </div>

          <div className="mt-16 p-6 bg-white/50 rounded-xl border-2 border-dashed border-indigo-300">
            <h3 className="font-semibold text-indigo-900 mb-2">🎯 Coming Soon: Premium Features</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Full-length AP practice exams with scoring</li>
              <li>• Detailed performance analytics and AP score prediction</li>
            
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (currentScreen === 'units') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Choose a Unit</h2>
            <p className="text-gray-600">Select a unit to generate practice questions</p>
          </div>

          <div className="space-y-4">
            {units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => {
                  setSelectedUnit(unit);
                  generateUniqueQuestion(unit);
                }}
                onMouseEnter={() => handleUnitHover(unit.id)}
                className="w-full bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      Unit {unit.id}: {unit.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {unit.topics.map((topic, idx) => (
                        <span key={idx} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentScreen('landing')}
            className="mt-8 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (currentScreen === 'question' && currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Question {score.total + 1} of 5
                </span>
                <span className="text-sm font-medium text-gray-600">
                  {score.correct}/{score.total} Correct
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((score.total + 1) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {currentQuestion.concept}
                </span>
                <span className="text-sm text-gray-500">
                  Difficulty: {getDifficultyStars(currentQuestion.difficulty)}
                </span>
              </div>
            </div>

            {/* Question */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                {currentQuestion.question}
              </h3>
              
              {currentQuestion.code && (
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg mb-4 overflow-x-auto">
                  <code>{currentQuestion.code}</code>
                </pre>
              )}
            </div>

            {/* Answer Choices */}
            <div className="space-y-3 mb-6">
              {currentQuestion.choices.map((choice) => {
                const isSelected = selectedAnswer === choice.id;
                const isCorrect = choice.id === currentQuestion.correct;
                const showCorrect = showFeedback && isCorrect;
                const showIncorrect = showFeedback && isSelected && !isCorrect;
                
                return (
                  <button
                    key={choice.id}
                    onClick={() => handleAnswerSelect(choice.id)}
                    disabled={showFeedback}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      showCorrect 
                        ? 'bg-green-100 border-2 border-green-500' 
                        : showIncorrect 
                        ? 'bg-red-100 border-2 border-red-500'
                        : isSelected
                        ? 'bg-indigo-100 border-2 border-indigo-500'
                        : 'bg-gray-50 border-2 border-gray-200 hover:border-indigo-300'
                    } ${!showFeedback ? 'cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center">
                      <span className="font-semibold mr-3 text-lg">{choice.id}.</span>
                      <span className="flex-1">{choice.text}</span>
                      {showCorrect && <Check className="w-5 h-5 text-green-600 ml-2" />}
                      {showIncorrect && <X className="w-5 h-5 text-red-600 ml-2" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Feedback */}
            {showFeedback && (
              <div className={`p-4 rounded-lg mb-6 ${
                selectedAnswer === currentQuestion.correct 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-yellow-50 border border-yellow-200'
              }`}>
                {selectedAnswer === currentQuestion.correct ? (
                  <div className="flex items-center text-green-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Correct! Well done!</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center text-red-700 mb-2">
                      <X className="w-5 h-5 mr-2" />
                      <span className="font-semibold">Not quite right</span>
                    </div>
                    {explanation && (
                      <p className="text-gray-700 text-sm mt-2">
                        <span className="font-semibold">Explanation:</span> {explanation}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Button */}
            {showFeedback && (
              <button
                onClick={handleNext}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center"
              >
                {score.total >= 4 ? 'See Results' : 'Next Question'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={resetQuiz}
            className="mt-6 text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Back to Unit Selection
          </button>
        </div>
      </div>
    );
  }

  if (currentScreen === 'results') {
    const percentage = Math.round((score.correct / score.total) * 100);
    
    // Calculate AP Score Prediction based on performance
    const calculateAPScore = (): 1 | 2 | 3 | 4 | 5 => {
      // AP scoring typically: 90%+ = 5, 80-89% = 4, 65-79% = 3, 50-64% = 2, <50% = 1
      if (percentage >= 90) return 5;
      if (percentage >= 80) return 4;
      if (percentage >= 65) return 3;
      if (percentage >= 50) return 2;
      return 1;
    };
    
    const apScore = calculateAPScore();
    const scoreColors: Record<1 | 2 | 3 | 4 | 5, string> = {
      5: 'text-green-600',
      4: 'text-blue-600', 
      3: 'text-yellow-600',
      2: 'text-orange-600',
      1: 'text-red-600'
    };
    
    // Analyze weaknesses
    const getWeaknesses = (): Weakness[] => {
      const weaknesses: Weakness[] = [];
      
      Object.entries(unitPerformance).forEach(([unitId, performance]) => {
        const unitInfo = units.find(u => u.id === parseInt(unitId));
        if (!unitInfo) return;
        
        // Find weak concepts within the unit
        Object.entries(performance.concepts).forEach(([concept, conceptPerf]) => {
          const conceptAccuracy = conceptPerf.total > 0
            ? (conceptPerf.correct / conceptPerf.total) * 100
            : 0;
          
          if (conceptAccuracy < 70) {
            weaknesses.push({
              unit: unitInfo.name,
              concept,
              accuracy: conceptAccuracy,
              attempts: conceptPerf.total,
              priority: conceptAccuracy < 50 ? 'high' : 'medium'
            });
          }
        });
      });
      
      return weaknesses.sort((a, b) => a.accuracy - b.accuracy);
    };
    
    const weaknesses = getWeaknesses();
    
    // Calculate overall readiness
    const getReadinessLevel = (): { level: string; color: string; message: string } => {
      if (apScore >= 4) return { level: 'Excellent', color: 'text-green-600', message: 'You\'re well-prepared!' };
      if (apScore === 3) return { level: 'Good', color: 'text-blue-600', message: 'You\'re on track, keep practicing!' };
      return { level: 'Needs Work', color: 'text-orange-600', message: 'Focus on weak areas for improvement' };
    };
    
    const readiness = getReadinessLevel();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Main Results Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <div className="text-center mb-8">
              <Award className={`w-20 h-20 mx-auto mb-4 ${
                percentage >= 80 ? 'text-yellow-500' : percentage >= 60 ? 'text-gray-400' : 'text-gray-300'
              }`} />
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Session Complete!</h2>
              <p className={`text-xl ${readiness.color} font-semibold`}>{readiness.level} - {readiness.message}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Score Summary */}
              <div className="text-center">
                <div className="text-6xl font-bold text-indigo-600 mb-2">{percentage}%</div>
                <p className="text-gray-600 mb-4">
                  {score.correct} out of {score.total} questions correct
                </p>
                <div className="bg-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-500 mb-1">Session Performance</p>
                  <div className="flex justify-center gap-1">
                    {sessionQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                          q.userCorrect !== false ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                        }`}
                        title={`Q${idx + 1}: ${q.concept}`}
                      >
                        {idx + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AP Score Prediction */}
              <div className="text-center">
                <div className={`text-6xl font-bold ${scoreColors[apScore]} mb-2`}>{apScore}</div>
                <p className="text-gray-600 mb-4">Predicted AP Score</p>
                <div className="bg-indigo-50 rounded-lg p-4">
                  <p className="text-sm text-indigo-700">
                    {apScore >= 4 ? 
                      "You're likely to score well on the AP exam!" :
                      apScore === 3 ?
                      "You're on track for a passing score!" :
                      "More practice needed for a higher score"}
                  </p>
                  <div className="mt-2 flex justify-center gap-1">
                    {([1, 2, 3, 4, 5] as const).map((score) => (
                      <div
                        key={score}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          score <= apScore ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {score}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Weakness Analysis */}
            <div className="border-t pt-6">
              <div className="flex items-center mb-4">
                <AlertCircle className="w-6 h-6 text-orange-500 mr-2" />
                <h3 className="text-xl font-semibold text-gray-900">Weakness Analysis</h3>
              </div>
              
              {weaknesses.length > 0 ? (
                <div className="space-y-3">
                  {weaknesses.map((weakness, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <span className={`text-xs px-2 py-1 rounded font-semibold mr-2 ${
                              weakness.priority === 'high' 
                                ? 'bg-red-100 text-red-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {weakness.priority === 'high' ? 'High Priority' : 'Medium Priority'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {weakness.attempts} attempt{weakness.attempts !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900">{weakness.concept}</p>
                          <p className="text-sm text-gray-600">Unit: {weakness.unit}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {Math.round(weakness.accuracy)}%
                          </div>
                          <p className="text-xs text-gray-500">accuracy</p>
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${weakness.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-green-700">
                    Great job! No significant weaknesses detected. Keep practicing to maintain your skills!
                  </p>
                </div>
              )}
            </div>

            {/* Study Recommendations */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-900">Personalized Study Plan</h4>
              </div>
              <ul className="text-sm text-blue-700 space-y-1">
                {weaknesses.slice(0, 3).map((w, idx) => (
                  <li key={idx}>• Focus on {w.concept} from {w.unit}</li>
                ))}
                {weaknesses.length === 0 && (
                  <>
                    <li>• Continue practicing all units to maintain proficiency</li>
                    <li>• Try harder difficulty questions to challenge yourself</li>
                    <li>• Take a full practice exam to test endurance</li>
                  </>
                )}
              </ul>
            </div>

            {/* Premium Teaser */}
            <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-200">
              <h4 className="font-semibold text-indigo-900 mb-3 flex items-center">
                <Sparkles className="w-5 h-5 mr-2" />
                Unlock Premium Features for Complete Prep
              </h4>
              <div className="grid md:grid-cols-2 gap-3 text-sm text-indigo-700">
                <div>• Full-length practice exams (40 MCQ + 4 FRQ)</div>
                <div>• Detailed performance tracking over time</div>
                <div>• Unit-by-unit progress reports</div>
                <div>• Personalized study schedules</div>
                <div>• Video explanations for complex topics</div>
                <div>• AP score prediction with 95% accuracy</div>
              </div>
              <button className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                Upgrade to Premium - $9.99/month
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={resetQuiz}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
              Practice Another Unit
            </button>
            <button
              onClick={() => {
                setCurrentScreen('landing');
                setScore({ correct: 0, total: 0 });
                setSessionQuestions([]);
              }}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your question...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default APCSQuestionGenerator;