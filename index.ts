import { OpenAI } from "langchain/llms/openai";
import { loadSummarizationChain, LLMChain } from "langchain/chains";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import { PromptTemplate } from "langchain/prompts";

const summarization = async (url: string) => {
  // Webページのテキストを取得
  const loader = new PuppeteerWebBaseLoader(url, {
    launchOptions: {
      headless: "new",
      args: ["--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"],
    },
    async evaluate(page) {
      const result = await page.evaluate(() => {
        // 不要な要素を削除
        const scripts = document.body.querySelectorAll("script");
        const noscript = document.body.querySelectorAll("noscript");
        const styles = document.body.querySelectorAll("style");
        const scriptAndStyle = [...scripts,  ...noscript, ...styles,];
        scriptAndStyle.forEach((e) => e.remove());

        // 本文を収集
        const mainElement = document.querySelector('main');
        return  mainElement ? mainElement.innerText : document.body.innerText;
      })
      return result;
    },
  });
  const docs = await loader.loadAndSplit();

  // モデルの指定 OpenAI gpt-3.5-turbo
  const model = new OpenAI({ openAIApiKey: process.env.OPENAI_API_KEY, temperature: 0, modelName: "gpt-3.5-turbo" });

  // promptの作成
  const prompt = new PromptTemplate({
    template: `以下の文章を要約してください。\n\n---\n{text}\n---\n\n要約:`,
    inputVariables: ["text"],
  });

  // 要約の実行
  const chain = loadSummarizationChain(model, {
    combineMapPrompt: prompt,
    combinePrompt: prompt,
    type: "map_reduce",
  });
  const result = await chain.call({
    input_documents: docs
  });

  console.log(`\n\n🔗 link:\n${url}\n\n📝 summary:\n${result.text}`);
}

(async () => {
  const targetUrl = process.argv[2]
  await summarization(targetUrl);
})()
