import logging
from typing import Optional, List, Dict, TypedDict, AsyncGenerator, Union, Literal
from config.settings import settings
from .llm.base import LLMProvider
from .llm.anthropic_provider import AnthropicProvider
from .llm.openai_provider import OpenAIProvider
from schemas import (
    QuestionAnalysis, ResearchAnswer, URLContent, 
    KnowledgeGraphElements, KnowledgeGraphNode, KnowledgeGraphRelationship
)

logger = logging.getLogger(__name__)

FAST_MODEL = "claude-3-5-haiku-20241022"

EXPAND_QUESTION_PROMPT = """You are a search query expansion expert that helps users find comprehensive information by generating relevant alternative search queries.

Break down the question into multiple search queries that will help find comprehensive information. Consider:
- Different aspects and phrasings of the concepts
- Alternative terminology
- Related subtopics
- Specific and general versions of the query

Return ONLY a list of search queries, with each query on a new line starting with "- ".

Example format:
- first search query here
- second search query here
- third search query here

IMPORTANT: Return ONLY the list of queries with "- " prefix. Do not include any sections, explanations, or other formatting."""

ANALYZE_QUESTION_PROMPT = """You are an expert research analyst. Analyze the given question and break down your analysis into clear sections using markdown.

Your response should be formatted in markdown with these sections:

## Key Components
- List the main elements that need to be addressed
- Each point should be a bullet point
- Focus on core concepts and requirements

## Scope Boundaries
- Define clear limits and constraints
- Specify what is and isn't included
- Establish the context and timeframe

## Success Criteria
- List what constitutes a complete answer
- Include measurable or verifiable points
- Define quality expectations

## Conflicting Viewpoints
- Identify potential areas of disagreement
- Note competing theories or approaches
- Highlight controversial aspects

Focus on questions that:
- Require multiple sources and synthesis of information
- Span multiple subject areas or disciplines
- Have potential for conflicting information
- Need specific, detailed answers with evidence

Use proper markdown formatting:
- Use ## for section headings
- Use - for bullet points
- Use **bold** for emphasis
- Keep formatting clean and consistent

IMPORTANT: Return ONLY the markdown text. Do not include any JSON formatting or additional explanations."""

SCORE_RESULTS_PROMPT = """You are an expert at evaluating search results for relevance to a query.
For each search result, analyze its relevance to the query and provide a score from 0-100 where:
- 90-100: Perfect match, directly answers the query
- 70-89: Highly relevant, contains most of the needed information
- 50-69: Moderately relevant, contains some useful information
- 30-49: Somewhat relevant, tangentially related
- 0-29: Not relevant or too general

Consider:
- How directly the content answers the query
- The specificity and depth of information
- The credibility of the source domain
- The comprehensiveness of the snippet
- The relevance of the title

IMPORTANT: Your response must be a valid JSON array of objects. Each object must have exactly two fields:
- "url": the exact URL from the search result
- "score": a number between 0 and 100

Example response format:
[
    {"url": "example.com/page1", "score": 85},
    {"url": "example.com/page2", "score": 45}
]

Do not include any other text or explanation in your response, only the JSON array."""

RESEARCH_ANSWER_PROMPT = """You are an expert research analyst synthesizing information to answer a question.

Question: {question}

Source Content:
{source_content}

Analyze the sources and provide a comprehensive answer. Your response must be a valid JSON object with these exact keys:
{{
    "answer": "detailed answer in markdown format, using proper markdown syntax for headings, lists, emphasis, etc.",
    "sources_used": ["list of URLs that contributed to the answer"],
    "confidence_score": number between 0-100 indicating confidence in the answer
}}

Guidelines:
- Format your answer using markdown syntax:
  - Use ## for section headings
  - Use * or - for bullet points
  - Use **text** for emphasis
  - Use > for important quotes or key points
  - Use --- for section breaks
- Synthesize information across sources
- Cite specific sources when making claims
- Acknowledge uncertainties or conflicting information
- Focus on answering the core question
- Structure your answer with clear sections
- Use markdown to improve readability

Example response format:
{{
    "answer": "## Overview\\n\\nBased on the analyzed sources, the key findings are...\\n\\n### Key Points\\n\\n* First important point\\n* Second important point\\n\\n> Important note: key consideration...\\n\\n### Detailed Analysis\\n\\nFurther examination reveals...",
    "sources_used": ["https://example.com/source1", "https://example.com/source2"],
    "confidence_score": 85
}}

IMPORTANT: Your response must be ONLY a valid JSON object. Do not include any explanatory text, markdown formatting, or code blocks outside the JSON structure."""

CURRENT_EVENTS_CHECK_PROMPT = """You are an expert at determining whether questions require current events context to be properly understood and answered.

Analyze if the given question requires current events context. Consider:
- Whether the answer would be significantly different based on recent events
- If understanding current developments is crucial to providing an accurate answer
- Whether the question explicitly or implicitly references ongoing situations
- If the topic is rapidly evolving or in active development

Return a JSON object with these fields:
{
    "requires_current_context": boolean,  // Whether current events context is needed
    "reasoning": string,  // Explanation of why current context is or isn't needed
    "timeframe": string,  // If context is needed, how recent should the context be? (e.g. "past week", "past month", "past year")
    "key_events": [string],  // If context is needed, what are the key events/developments to look for
    "search_queries": [string]  // If context is needed, suggested search queries to gather this context
}

Example response for "What are the implications of the latest banking regulations?":
{
    "requires_current_context": true,
    "reasoning": "Banking regulations are actively changing with recent financial events",
    "timeframe": "past 6 months",
    "key_events": [
        "Recent bank failures and regulatory responses",
        "New federal reserve policies",
        "Legislative changes in banking oversight"
    ],
    "search_queries": [
        "latest banking regulations 2024",
        "recent changes banking oversight",
        "bank failure new regulations"
    ]
}

IMPORTANT: Return ONLY the JSON object, no additional text or explanation."""

EVALUATE_ANSWER_PROMPT = """You are an expert at evaluating research answers for completeness, accuracy, and relevance.

Analyze how well the provided answer addresses the research question, considering:
1. The key components identified in the question analysis
2. The scope boundaries defined
3. The success criteria established
4. Any conflicting viewpoints noted

Return a JSON object with these fields:
{
    "completeness_score": float,  // 0-100 score for how completely the answer addresses all aspects
    "accuracy_score": float,      // 0-100 score for factual accuracy
    "relevance_score": float,     // 0-100 score for how relevant the answer is to the question
    "overall_score": float,       // 0-100 weighted average of the above scores
    "missing_aspects": [string],  // List of key aspects not addressed in the answer
    "improvement_suggestions": [string],  // List of specific suggestions to improve the answer
    "conflicting_aspects": [      // List of conflicts found in the answer
        {
            "aspect": string,     // The aspect where conflict was found
            "conflict": string    // Description of the conflict
        }
    ]
}

Scoring Guidelines:
- Completeness: How many key components and success criteria are addressed
- Accuracy: Factual correctness and proper use of information
- Relevance: How well it stays within scope boundaries and addresses the core question
- Overall: Weighted combination of the above, considering relative importance

Example response:
{
    "completeness_score": 85.5,
    "accuracy_score": 90.0,
    "relevance_score": 88.5,
    "overall_score": 88.0,
    "missing_aspects": [
        "Economic impact analysis",
        "Long-term sustainability considerations"
    ],
    "improvement_suggestions": [
        "Include more quantitative data",
        "Address economic implications"
    ],
    "conflicting_aspects": [
        {
            "aspect": "Timeline analysis",
            "conflict": "Answer states the event occurred in 2020 but later references it happening in 2021"
        }
    ]
}

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text or markdown formatting."""

IMPROVE_QUESTION_PROMPT = """You are an expert at analyzing and improving complex research questions. Your goal is to help make questions clearer, more complete, and more effective.

Analyze the given question and provide suggestions for improvement in these key areas:
- Clarity: Identify any ambiguous terms or concepts that need definition
- Scope: Check if the scope is too broad or too narrow
- Precision: Point out where more specific language could be used
- Assumptions: Uncover implicit assumptions that should be made explicit
- Context: Note any missing contextual information needed
- Structure: Suggest better ways to structure or phrase the question

Your response must be a valid JSON object with these exact keys:
{
    "original_question": "the original question text",
    "analysis": {
        "clarity_issues": ["list of unclear terms or concepts"],
        "scope_issues": ["points about scope"],
        "precision_issues": ["areas needing more precise language"],
        "implicit_assumptions": ["assumptions that should be stated"],
        "missing_context": ["required context that's absent"],
        "structural_improvements": ["suggestions for better phrasing"]
    },
    "improved_question": "A rewritten version of the question incorporating all improvements",
    "improvement_explanation": "A brief explanation of the key improvements made"
}"""

EXTRACT_KNOWLEDGE_GRAPH_PROMPT = '''You are an expert at extracting structured knowledge from text to build knowledge graphs.

Analyze the given text and identify key entities (nodes) and their relationships (edges) to create a knowledge graph.

Guidelines for extraction:
- Focus on meaningful entities and relationships that capture key information
- Use consistent naming for similar types of entities
- Capture directional relationships where relevant
- Include relevant properties for both nodes and relationships (use empty object {} if no properties)
- Avoid overly generic or uninformative relationships
- Ensure relationship types are specific and meaningful
- IMPORTANT: Every relationship MUST have a properties field, even if empty

Return a JSON object with this structure:
{
    "nodes": [
        {
            "id": "unique_id",
            "label": "entity_type",
            "properties": {
                "name": "entity_name",
                "additional_properties": "values"
            }
        }
    ],
    "relationships": [
        {
            "source": "source_node_id",
            "target": "target_node_id",
            "type": "relationship_type",
            "properties": {
                "additional_properties": "values"
            }
        }
    ]
}

Example response:
{
    "nodes": [
        {
            "id": "p1",
            "label": "Person",
            "properties": {
                "name": "John Smith",
                "role": "CEO"
            }
        },
        {
            "id": "c1",
            "label": "Company",
            "properties": {
                "name": "Tech Corp",
                "industry": "Technology"
            }
        }
    ],
    "relationships": [
        {
            "source": "p1",
            "target": "c1",
            "type": "LEADS",
            "properties": {
                "since": "2020"
            }
        },
        {
            "source": "p1",
            "target": "c1",
            "type": "OWNS",
            "properties": {}  // Example of empty properties when no additional info
        }
    ]
}

IMPORTANT: 
1. Return ONLY the JSON object. Do not include any explanatory text or markdown formatting.
2. Every relationship MUST include a properties field, even if it's an empty object {}.
3. Ensure all IDs are unique and referenced correctly in relationships.'''

class MessageContent(TypedDict, total=False):
    """TypedDict for message content that can include text and/or image data"""
    text: str
    image_url: str
    image_data: bytes
    image_mime_type: str

class Message(TypedDict):
    """TypedDict for a complete message including role and content"""
    role: Literal["user", "assistant", "system"]
    content: Union[str, List[MessageContent]]

class AIService:
    def __init__(self):
        self.provider: LLMProvider = AnthropicProvider()

    def set_provider(self, provider: str):
        """Change the LLM provider"""
        if provider == "openai":
            self.provider = OpenAIProvider()
        elif provider == "anthropic":
            self.provider = AnthropicProvider()
        else:
            raise ValueError(f"Unsupported provider: {provider}")

    async def analyze_question(self, question: str, model: Optional[str] = None) -> QuestionAnalysis:
        """
        Analyze a question to determine its key components, scope, and success criteria.

        Args:
            question: The question to analyze
            model: Optional specific model to use

        Returns:
            QuestionAnalysis: Pydantic model containing the analysis components
        """
        try:
            messages = [
                {"role": "user", "content": f"Analyze this question: {question}"}
            ]

            content = await self.provider.create_chat_completion(
                messages=messages,
                system=ANALYZE_QUESTION_PROMPT,
                model=model
            )

            try:
                # Clean the response string
                response_text = content.strip()
                if response_text.startswith('```json'):
                    response_text = response_text.split('```')[1].strip()
                elif response_text.startswith('```'):
                    response_text = response_text.split('```')[1].strip()

                # Parse JSON response and create Pydantic model
                import json
                analysis_dict = json.loads(response_text)

                # Create and validate with Pydantic model
                return QuestionAnalysis(
                    key_components=analysis_dict.get('key_components', []),
                    scope_boundaries=analysis_dict.get('scope_boundaries', []),
                    success_criteria=analysis_dict.get('success_criteria', []),
                    conflicting_viewpoints=analysis_dict.get(
                        'conflicting_viewpoints', [])
                )

            except json.JSONDecodeError as e:
                logger.error(
                    f"Error parsing analysis JSON response: {str(e)}\nResponse: {content}")
                return QuestionAnalysis(
                    key_components=[],
                    scope_boundaries=[],
                    success_criteria=[],
                    conflicting_viewpoints=[]
                )

        except Exception as e:
            logger.error(f"Error in analyze_question_scope: {str(e)}")
            return QuestionAnalysis(
                key_components=[],
                scope_boundaries=[],
                success_criteria=[],
                conflicting_viewpoints=[]
            )

    async def analyze_question_stream(self, question: str, model: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream the analysis of a question, returning raw response chunks as they arrive.

        Args:
            question: The question to analyze
            model: Optional specific model to use

        Yields:
            Raw text chunks from the LLM response
        """
        try:
            messages = [
                {"role": "user", "content": f"Analyze this question: {question}"}
            ]

            async for chunk in self.provider.create_chat_completion_stream(
                messages=messages,
                system=ANALYZE_QUESTION_PROMPT,
                model=model
            ):
                yield chunk

        except Exception as e:
            logger.error(f"Error in analyze_question_scope_stream: {str(e)}")
            raise

    async def expand_query(self, question: str) -> List[str]:
        """
        Expand a question into multiple search queries.
        """
        try:
            prompt = f"""Given this research question, generate a set of search queries that will help find relevant information.
            Break down complex concepts and consider different aspects and phrasings.
            
            Question: {question}
            
            Return only the list of search queries, one per line starting with "- ".
            """

            response = await self.openai_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=1000
            )

            queries = response.choices[0].message.content.strip().split('\n')
            return [q.strip('- ').strip() for q in queries if q.strip().startswith('-')]

        except Exception as e:
            logger.error(f"Error in expand_query: {str(e)}")
            return []

    async def expand_query_stream(self, question: str):
        """
        Stream the process of expanding a question into search queries with explanations.
        """
        try:
            # Generate the explanatory markdown
            messages = [{"role": "user", "content": f"Question: {question}"}]

            async for chunk in self.provider.create_chat_completion_stream(
                messages=messages,
                system=EXPAND_QUESTION_PROMPT
            ):
                yield chunk

        except Exception as e:
            logger.error(f"Error in expand_query_stream: {str(e)}")
            yield "Error: Failed to expand query. Please try again.\n"

    async def get_research_answer(self,
                                  question: str,
                                  source_content: List[URLContent],
                                  model: Optional[str] = None
                                  ) -> ResearchAnswer:
        """
        Generate a final research answer from analyzed sources.

        Args:
            question: The research question
            source_content: List of URLContent objects containing the source content
            model: Optional specific model to use

        Returns:
            ResearchAnswer: Final synthesized answer with sources and confidence
        """
        try:
            # Format source content for the prompt
            formatted_sources = "\n\n".join([
                f"Source ({content.url}):\nTitle: {content.title}\n{content.text}"
                for content in source_content
                if not content.error  # Skip sources with errors
            ])

            messages = [
                {"role": "user", "content": RESEARCH_ANSWER_PROMPT.format(
                    question=question,
                    source_content=formatted_sources
                )}
            ]

            content = await self.provider.create_chat_completion(
                messages=messages,
                system=RESEARCH_ANSWER_PROMPT,
                model=model
            )

            # Parse JSON response
            response_text = content.strip()

            # Remove any markdown code block markers
            if '```' in response_text:
                # Extract content between first and last ```
                parts = response_text.split('```')
                if len(parts) >= 3:
                    response_text = parts[1]
                    if response_text.startswith('json'):
                        response_text = response_text[4:]
                    response_text = response_text.strip()

            # Clean up any remaining whitespace or newlines
            response_text = response_text.strip()

            try:
                # Try to fix common JSON issues
                if response_text.endswith(','):
                    response_text = response_text[:-1]
                if '"sources_used": [' in response_text and not ']' in response_text.split('"sources_used": [')[1]:
                    response_text = response_text.split('"sources_used": [')[
                        0] + '"sources_used": []}'

                import json
                result = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {str(e)}")
                logger.error(f"Response text: {response_text}")

                # Try to salvage the answer if possible
                answer_match = '"answer": "(.+?)",' in response_text
                if answer_match:
                    return ResearchAnswer(
                        answer=answer_match.group(1),
                        sources_used=[],
                        confidence_score=0.0
                    )
                raise

            # Validate required fields
            if not isinstance(result.get('answer'), str):
                raise ValueError(
                    "Missing or invalid 'answer' field in response")

            # Ensure sources is a list and contains valid URLs
            sources = result.get('sources_used', [])
            if not isinstance(sources, list):
                sources = []
            # Filter out any truncated or invalid URLs
            sources = [s for s in sources if isinstance(
                s, str) and s.startswith('http')]

            # Ensure confidence score is valid
            try:
                confidence = float(result.get('confidence_score', 0.0))
                # Clamp between 0 and 100
                confidence = max(0.0, min(100.0, confidence))
            except (TypeError, ValueError):
                confidence = 0.0

            return ResearchAnswer(
                answer=result['answer'],
                sources_used=sources,
                confidence_score=confidence
            )

        except Exception as e:
            logger.error(f"Error generating research answer: {str(e)}")
            logger.error(f"Question: {question}")
            logger.error(f"Number of sources: {len(source_content)}")
            return ResearchAnswer(
                answer="Error generating answer. Please try again.",
                sources_used=[],
                confidence_score=0.0
            )

    async def get_research_answer_stream(self,
                                         question: str,
                                         source_content: List[URLContent],
                                         model: Optional[str] = None
                                         ) -> AsyncGenerator[str, None]:
        """
        Stream a research answer from analyzed sources.

        Args:
            question: The research question
            source_content: List of URLContent objects containing the source content
            model: Optional specific model to use

        Yields:
            Raw text chunks from the LLM response
        """
        try:
            # Format source content for the prompt
            formatted_sources = "\n\n".join([
                f"Source ({content.url}):\nTitle: {content.title}\n{content.text}"
                for content in source_content
                if not content.error  # Skip sources with errors
            ])

            messages = [
                {"role": "user", "content": RESEARCH_ANSWER_PROMPT.format(
                    question=question,
                    source_content=formatted_sources
                )}
            ]

            async for chunk in self.provider.create_chat_completion_stream(
                messages=messages,
                system=RESEARCH_ANSWER_PROMPT,
                model=model
            ):
                yield chunk

        except Exception as e:
            logger.error(f"Error streaming research answer: {str(e)}")
            logger.error(f"Question: {question}")
            logger.error(f"Number of sources: {len(source_content)}")
            raise

    async def close(self):
        """Cleanup method to close the provider session"""
        await self.provider.close()

    async def score_results(self,
                            query: str,
                            results: List[Dict[str, str]],
                            model: Optional[str] = None
                            ) -> List[Dict[str, float]]:
        """Score search results based on relevance to the query."""
        try:
            logger.info(f"Scoring {len(results)} results for query: {query}")
            if model:
                logger.info(f"Using specified model: {model}")

            # Format results for the prompt
            results_text = "\n\n".join([
                f"URL: {result['url']}\n{result['content']}"
                for result in results
            ])
            logger.debug(f"Formatted results for scoring:\n{results_text}")

            prompt = f"{SCORE_RESULTS_PROMPT}\n\nQuery: {query}\n\nResults to score:\n{results_text}"
            logger.debug(f"Full prompt:\n{prompt}")

            # Get scores from AI
            logger.info("Requesting scores from AI provider...")
            response = await self.provider.generate(
                prompt=prompt,
                model=model,
                max_tokens=1000
            )
            logger.debug(f"Raw AI response:\n{response}")

            try:
                # Clean the response string
                response_text = response.strip()
                if response_text.startswith('```json'):
                    logger.debug(
                        "Detected JSON code block, extracting content")
                    response_text = response_text.split('```')[1].strip()
                elif response_text.startswith('```'):
                    logger.debug("Detected code block, extracting content")
                    response_text = response_text.split('```')[1].strip()

                logger.debug(f"Cleaned response text:\n{response_text}")

                # Parse the JSON response
                import json
                scores = json.loads(response_text)
                logger.debug(f"Parsed JSON scores: {scores}")

                if not isinstance(scores, list):
                    logger.error(
                        f"AI response is not a list. Type: {type(scores)}")
                    raise ValueError("Invalid response format")

                # Validate and clean up scores
                validated_scores = []
                result_urls = {result['url'] for result in results}
                logger.debug(f"Valid URLs: {result_urls}")

                for score in scores:
                    logger.debug(f"Processing score entry: {score}")
                    if not isinstance(score, dict):
                        logger.warning(
                            f"Skipping non-dict score entry: {score}")
                        continue

                    if 'url' not in score or 'score' not in score:
                        logger.warning(
                            f"Skipping score entry missing required fields: {score}")
                        continue

                    if score['url'] not in result_urls:
                        logger.warning(
                            f"Skipping score for unknown URL: {score['url']}")
                        continue

                    try:
                        # Ensure score is a number and within bounds
                        original_score = score['score']
                        score['score'] = max(
                            0, min(100, float(score['score'])))
                        if score['score'] != original_score:
                            logger.info(
                                f"Adjusted score for {score['url']} from {original_score} to {score['score']}")
                        validated_scores.append(score)
                        logger.debug(f"Validated score entry: {score}")
                    except (TypeError, ValueError):
                        logger.error(
                            f"Invalid score value for URL {score['url']}: {score.get('score')}")
                        continue

                # Ensure we have scores for all results
                if len(validated_scores) < len(results):
                    logger.warning(
                        f"Missing scores for some URLs. Found {len(validated_scores)} of {len(results)}")
                    missing_urls = result_urls - \
                        {score['url'] for score in validated_scores}
                    for url in missing_urls:
                        default_score = {'url': url, 'score': 50.0}
                        validated_scores.append(default_score)
                        logger.warning(
                            f"Added default score for missing URL: {url}")

                logger.info(
                    f"Successfully scored {len(validated_scores)} results")
                logger.debug(f"Final validated scores: {validated_scores}")
                return validated_scores

            except json.JSONDecodeError as e:
                logger.error(
                    f"Error parsing score results JSON: {str(e)}\nResponse: {response}")
                default_scores = [{'url': result['url'],
                                   'score': 50.0} for result in results]
                logger.info(
                    f"Returning default scores for {len(default_scores)} results")
                return default_scores

        except Exception as e:
            logger.error(f"Error in score_results: {str(e)}", exc_info=True)
            default_scores = [{'url': result['url'], 'score': 50.0}
                              for result in results]
            logger.info(
                f"Returning default scores for {len(default_scores)} results")
            return default_scores

    async def check_current_events_context(self, question: str, model: Optional[str] = None) -> Dict:
        """
        Analyze whether a question requires current events context to be properly understood and answered.

        Args:
            question: The question to analyze
            model: Optional specific model to use

        Returns:
            Dict containing analysis of current events context requirements
        """
        try:
            messages = [
                {"role": "user", "content": f"Question: {question}"}
            ]

            content = await self.provider.create_chat_completion(
                messages=messages,
                system=CURRENT_EVENTS_CHECK_PROMPT,
                model=FAST_MODEL
            )

            try:
                # Clean the response string
                response_text = content.strip()
                if response_text.startswith('```json'):
                    response_text = response_text.split('```')[1].strip()
                elif response_text.startswith('```'):
                    response_text = response_text.split('```')[1].strip()

                # Parse JSON response
                import json
                return json.loads(response_text)

            except json.JSONDecodeError as e:
                logger.error(
                    f"Error parsing current events check JSON response: {str(e)}\nResponse: {content}")
                return {
                    "requires_current_context": False,
                    "reasoning": "Error analyzing current events context",
                    "timeframe": "",
                    "key_events": [],
                    "search_queries": []
                }

        except Exception as e:
            logger.error(f"Error in check_current_events_context: {str(e)}")
            return {
                "requires_current_context": False,
                "reasoning": "Error analyzing current events context",
                "timeframe": "",
                "key_events": [],
                "search_queries": []
            }

    async def check_current_events_context_stream(self, question: str, model: Optional[str] = None) -> AsyncGenerator[str, None]:
        """
        Stream the analysis of whether a question requires current events context.

        Args:
            question: The question to analyze
            model: Optional specific model to use

        Yields:
            Raw text chunks from the LLM response
        """
        try:
            messages = [
                {"role": "user", "content": f"Question: {question}"}
            ]

            async for chunk in self.provider.create_chat_completion_stream(
                messages=messages,
                system=CURRENT_EVENTS_CHECK_PROMPT,
                model=model
            ):
                yield chunk

        except Exception as e:
            logger.error(
                f"Error in check_current_events_context_stream: {str(e)}")
            raise

    async def evaluate_answer(self,
                              question: str,
                              key_components: List[str],
                              scope_boundaries: List[str],
                              success_criteria: List[str],
                              answer: str,
                              model: Optional[str] = None
                              ) -> Dict:
        """
        Evaluate how well an answer addresses a research question.

        Args:
            question: The original research question
            key_components: Key components identified in the question
            scope_boundaries: Identified boundaries and scope
            success_criteria: Criteria for a successful answer
            answer: The answer to evaluate
            model: Optional specific model to use

        Returns:
            Dict containing the evaluation scores and feedback
        """
        try:
            # Format the analysis components for the prompt
            analysis_text = f"""
Question Analysis:
- Key Components: {', '.join(key_components)}
- Scope Boundaries: {', '.join(scope_boundaries)}
- Success Criteria: {', '.join(success_criteria)}

Question: {question}

Answer to Evaluate: {answer}
"""
            messages = [
                {"role": "user", "content": analysis_text}
            ]

            content = await self.provider.create_chat_completion(
                messages=messages,
                system=EVALUATE_ANSWER_PROMPT,
                model=model or FAST_MODEL
            )

            try:
                # Clean the response string
                response_text = content.strip()
                if response_text.startswith('```json'):
                    response_text = response_text.split('```')[1].strip()
                elif response_text.startswith('```'):
                    response_text = response_text.split('```')[1].strip()

                # Parse JSON response
                import json
                result = json.loads(response_text)

                # Ensure all required fields are present with valid values
                result['completeness_score'] = max(
                    0.0, min(100.0, float(result.get('completeness_score', 0.0))))
                result['accuracy_score'] = max(
                    0.0, min(100.0, float(result.get('accuracy_score', 0.0))))
                result['relevance_score'] = max(
                    0.0, min(100.0, float(result.get('relevance_score', 0.0))))
                result['overall_score'] = max(
                    0.0, min(100.0, float(result.get('overall_score', 0.0))))
                result['missing_aspects'] = result.get('missing_aspects', [])
                result['improvement_suggestions'] = result.get(
                    'improvement_suggestions', [])
                result['conflicting_aspects'] = result.get(
                    'conflicting_aspects', [])

                return result

            except json.JSONDecodeError as e:
                logger.error(
                    f"Error parsing evaluation JSON response: {str(e)}\nResponse: {content}")
                return {
                    "completeness_score": 0.0,
                    "accuracy_score": 0.0,
                    "relevance_score": 0.0,
                    "overall_score": 0.0,
                    "missing_aspects": ["Error evaluating answer"],
                    "improvement_suggestions": ["Please try again"],
                    "conflicting_aspects": [{
                        "aspect": "Evaluation Error",
                        "conflict": f"An error occurred during evaluation: {str(e)}"
                    }]
                }

        except Exception as e:
            logger.error(f"Error in evaluate_answer: {str(e)}")
            return {
                "completeness_score": 0.0,
                "accuracy_score": 0.0,
                "relevance_score": 0.0,
                "overall_score": 0.0,
                "missing_aspects": ["Error evaluating answer"],
                "improvement_suggestions": ["Please try again"],
                "conflicting_aspects": [{
                    "aspect": "Evaluation Error",
                    "conflict": f"An error occurred during evaluation: {str(e)}"
                }]
            }

    async def improve_question(self, question: str, model: Optional[str] = None) -> Dict:
        """
        Analyze a question and suggest improvements for clarity, completeness, and effectiveness.

        Args:
            question: The question to analyze and improve
            model: Optional specific model to use

        Returns:
            Dict containing the analysis and improvements
        """
        try:
            messages = [
                {"role": "user", "content": f"Question: {question}"}
            ]

            content = await self.provider.create_chat_completion(
                messages=messages,
                system=IMPROVE_QUESTION_PROMPT,
                model=model or FAST_MODEL
            )

            try:
                # Clean the response string
                response_text = content.strip()
                if response_text.startswith('```json'):
                    response_text = response_text.split('```')[1].strip()
                elif response_text.startswith('```'):
                    response_text = response_text.split('```')[1].strip()

                # Parse JSON response
                import json
                result = json.loads(response_text)

                # Validate the response has all required fields
                required_fields = ['original_question', 'analysis',
                                   'improved_question', 'improvement_explanation']
                if not all(field in result for field in required_fields):
                    raise ValueError("Missing required fields in response")

                # Validate analysis subfields
                analysis_fields = ['clarity_issues', 'scope_issues', 'precision_issues',
                                   'implicit_assumptions', 'missing_context', 'structural_improvements']
                if not all(field in result['analysis'] for field in analysis_fields):
                    raise ValueError(
                        "Missing required analysis fields in response")

                return result

            except json.JSONDecodeError as e:
                logger.error(
                    f"Error parsing improve question JSON response: {str(e)}\nResponse: {content}")
                return {
                    "original_question": question,
                    "analysis": {
                        "clarity_issues": ["Error analyzing question"],
                        "scope_issues": [],
                        "precision_issues": [],
                        "implicit_assumptions": [],
                        "missing_context": [],
                        "structural_improvements": []
                    },
                    "improved_question": question,
                    "improvement_explanation": "An error occurred during analysis"
                }

        except Exception as e:
            logger.error(f"Error in improve_question: {str(e)}")
            return {
                "original_question": question,
                "analysis": {
                    "clarity_issues": ["Error analyzing question"],
                    "scope_issues": [],
                    "precision_issues": [],
                    "implicit_assumptions": [],
                    "missing_context": [],
                    "structural_improvements": []
                },
                "improved_question": question,
                "improvement_explanation": f"An error occurred: {str(e)}"
            }

    async def extract_knowledge_graph_elements(self, document: str, model: Optional[str] = None) -> KnowledgeGraphElements:
        """
        Extract nodes and relationships from a document to populate a knowledge graph.

        Args:
            document (str): The text document to analyze
            model (Optional[str]): Optional specific model to use

        Returns:
            KnowledgeGraphElements: Extracted nodes and relationships with proper validation
        """
        try:
            logger.info(f"Starting knowledge graph extraction for document of length {len(document)}")
            messages = [
                {"role": "user", "content": f"Extract knowledge graph elements from this text:\n\n{document}"}
            ]

            content = await self.provider.create_chat_completion(
                messages=messages,
                system=EXTRACT_KNOWLEDGE_GRAPH_PROMPT,
                model=model or FAST_MODEL
            )

            try:
                # Clean the response string
                response_text = content.strip()
                logger.debug(f"Raw AI response: {response_text}")

                if response_text.startswith('```json'):
                    response_text = response_text.split('```')[1].strip()
                    logger.debug("Removed JSON code block markers")
                elif response_text.startswith('```'):
                    response_text = response_text.split('```')[1].strip()
                    logger.debug("Removed code block markers")

                # Parse JSON response and validate with Pydantic
                import json
                try:
                    raw_result = json.loads(response_text)
                    logger.debug(f"Parsed JSON result: {raw_result}")
                except json.JSONDecodeError as e:
                    logger.error(f"Failed to parse JSON: {str(e)}\nResponse text: {response_text}")
                    raise
                
                # Log the extracted elements before validation
                logger.info(f"Extracted {len(raw_result.get('nodes', []))} nodes and {len(raw_result.get('relationships', []))} relationships")
                
                # Convert raw dictionaries to Pydantic models for validation
                try:
                    nodes = [KnowledgeGraphNode(**node) for node in raw_result.get('nodes', [])]
                    logger.debug(f"Successfully validated {len(nodes)} nodes")
                except Exception as e:
                    logger.error(f"Node validation error: {str(e)}")
                    raise

                try:
                    relationships = [KnowledgeGraphRelationship(**rel) for rel in raw_result.get('relationships', [])]
                    logger.debug(f"Successfully validated {len(relationships)} relationships")
                except Exception as e:
                    logger.error(f"Relationship validation error: {str(e)}")
                    raise
                
                # Create and validate the final result
                result = KnowledgeGraphElements(nodes=nodes, relationships=relationships)
                logger.info(f"Successfully created knowledge graph with {len(result.nodes)} nodes and {len(result.relationships)} relationships")
                return result

            except json.JSONDecodeError as e:
                logger.error(f"Error parsing knowledge graph JSON response: {str(e)}\nResponse: {content}")
                return KnowledgeGraphElements(nodes=[], relationships=[])

        except Exception as e:
            logger.error(f"Error in extract_knowledge_graph_elements: {str(e)}")
            logger.exception("Full traceback:")
            return KnowledgeGraphElements(nodes=[], relationships=[])

    async def send_messages(self, 
                          messages: List[Message],
                          model: Optional[str] = None,
                          max_tokens: Optional[int] = None,
                          system: Optional[str] = None
                          ) -> str:
        """
        Send a collection of messages that can contain text and/or images to the AI provider.

        Args:
            messages: List of messages with role and content. Content can be text or image data.
            model: Optional model to use (defaults to provider's default)
            max_tokens: Optional maximum tokens for response
            system: Optional system message to include in the prompt

        Returns:
            The AI provider's response text
        """
        try:
            # Format messages for the provider
            formatted_messages = []
            
            for msg in messages:
                if isinstance(msg["content"], str):
                    # Simple text message
                    formatted_messages.append({
                        "role": msg["role"],
                        "content": msg["content"]
                    })
                else:
                    # Message with potential multiple content parts
                    content_parts = []
                    for part in msg["content"]:
                        if "text" in part:
                            content_parts.append({
                                "type": "text",
                                "text": part["text"]
                            })
                        if "image_url" in part:
                            content_parts.append({
                                "type": "image",
                                "image_url": part["image_url"]
                            })
                        elif "image_data" in part and "image_mime_type" in part:
                            # Convert binary image data to base64
                            import base64
                            image_base64 = base64.b64encode(part["image_data"]).decode('utf-8')
                            content_parts.append({
                                "type": "image",
                                "image_url": f"data:{part['image_mime_type']};base64,{image_base64}"
                            })
                    
                    formatted_messages.append({
                        "role": msg["role"],
                        "content": content_parts
                    })

            # Send to provider
            response = await self.provider.create_chat_completion(
                messages=formatted_messages,
                model=model,
                max_tokens=max_tokens,
                system=system
            )

            return response

        except Exception as e:
            logger.error(f"Error in send_messages: {str(e)}")
            raise


# Create a singleton instance
ai_service = AIService()

__all__ = ['ai_service']
