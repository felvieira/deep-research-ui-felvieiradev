# Deep Research UI

Interface moderna para pesquisa avançada usando IA, construída com Next.js e Tailwind CSS. O sistema permite realizar pesquisas profundas e gerar relatórios detalhados e estruturados.

Inspirado e baseado no Deep Research do David Zhang.
https://github.com/dzhng/deep-research

## Funcionalidades

- **Pesquisa Avançada**: Configure a amplitude e profundidade da sua pesquisa
- **Perguntas de Acompanhamento**: Geração automática de perguntas relevantes
- **Relatório Estruturado**: Geração de relatórios em markdown com fontes
- **Editor Integrado**: Editor markdown para personalizar seus relatórios
- **Histórico Completo**: Salva todas as pesquisas com detalhes e configurações
- **Temas**: Suporte a tema claro e escuro
- **Configuração de LLM**: Configure diferentes modelos e parâmetros

## Tecnologias

- Next.js 14
- React
- TypeScript
- Tailwind CSS
- Lucide Icons
- OpenRouter API
- Docker

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/felvieira/open-deep-research-ui.git
cd open-deep-research-ui
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env.local
```
Edite `.env.local` e adicione suas chaves de API:
```env
OPENROUTER_API_KEY=sua_chave
FIRECRAWL_API_KEY=sua_chave
CONTEXT_SIZE="128000"
```

4. Execute o projeto:
```bash
npm run dev
```

## Docker

Para executar com Docker:

```bash
docker-compose up -d
```

O sistema estará disponível em `http://localhost:3000`

## Deploy no Coolify

1. No Coolify, crie um novo serviço
2. Selecione "Docker Compose"
3. Aponte para este repositório
4. Configure as variáveis de ambiente:
   - OPENROUTER_API_KEY
   - FIRECRAWL_API_KEY
5. Deploy!

## Licença

Este projeto está sob a licença GPL/AGPL com cláusula comercial. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

### Uso Comercial
O uso comercial deste software requer permissão explícita do autor.

## Autor

Felipe Vieira

## Contribuição

1. Faça um Fork do projeto
2. Crie sua Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a Branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request
