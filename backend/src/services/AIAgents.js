import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Base AI Agent class
 */
class BaseAgent {
  constructor(name, systemPrompt) {
    this.name = name;
    this.systemPrompt = systemPrompt;
  }

  async execute(task) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: this.systemPrompt },
          { role: 'user', content: task }
        ],
        max_tokens: 2000,
        temperature: 0.7
      });

      return {
        success: true,
        agent: this.name,
        result: response.choices[0].message.content,
        usage: response.usage
      };
    } catch (error) {
      return {
        success: false,
        agent: this.name,
        error: error.message
      };
    }
  }
}

/**
 * Searcher Agent - Busca información y datos relevantes
 */
export class SearcherAgent extends BaseAgent {
  constructor() {
    super('Searcher', `Eres un agente de búsqueda especializado. Tu trabajo es:
- Analizar la solicitud del usuario para entender qué información necesita
- Estructurar los resultados de búsqueda de forma clara
- Proporcionar fuentes y referencias cuando sea posible
- Resumir los puntos clave encontrados

Responde siempre en formato estructurado con secciones claras.`);
  }

  async search(query) {
    const task = `Busca y recopila información sobre: ${query}

Proporciona:
1. Resumen ejecutivo
2. Puntos clave encontrados
3. Datos relevantes
4. Fuentes sugeridas para más información`;

    return this.execute(task);
  }
}

/**
 * Analyst Agent - Analiza datos y proporciona insights
 */
export class AnalystAgent extends BaseAgent {
  constructor() {
    super('Analyst', `Eres un agente analista especializado. Tu trabajo es:
- Analizar datos y información proporcionada
- Identificar patrones, tendencias y anomalías
- Proporcionar insights accionables
- Hacer recomendaciones basadas en evidencia

Sé preciso, objetivo y basa tus conclusiones en los datos.`);
  }

  async analyze(data, context = '') {
    const task = `Analiza la siguiente información:

${data}

${context ? `Contexto adicional: ${context}` : ''}

Proporciona:
1. Análisis principal
2. Patrones identificados
3. Insights clave
4. Recomendaciones`;

    return this.execute(task);
  }
}

/**
 * Writer Agent - Genera contenido y documentación
 */
export class WriterAgent extends BaseAgent {
  constructor() {
    super('Writer', `Eres un agente escritor especializado. Tu trabajo es:
- Generar contenido claro y bien estructurado
- Adaptar el tono y estilo según el contexto
- Crear documentación técnica cuando sea necesario
- Producir textos persuasivos y profesionales

Escribe de forma concisa pero completa.`);
  }

  async write(topic, style = 'professional', format = 'article') {
    const task = `Escribe contenido sobre: ${topic}

Estilo: ${style}
Formato: ${format}

Requisitos:
- Contenido original y bien estructurado
- Incluir introducción, desarrollo y conclusión
- Usar subtítulos cuando sea apropiado
- Tono ${style}`;

    return this.execute(task);
  }
}

/**
 * Agent Factory - Crea instancias de agentes
 */
export const AgentFactory = {
  create(type) {
    switch (type) {
      case 0:
      case 'Searcher':
        return new SearcherAgent();
      case 1:
      case 'Analyst':
        return new AnalystAgent();
      case 2:
      case 'Writer':
        return new WriterAgent();
      default:
        throw new Error(`Unknown agent type: ${type}`);
    }
  }
};

export default { SearcherAgent, AnalystAgent, WriterAgent, AgentFactory };
