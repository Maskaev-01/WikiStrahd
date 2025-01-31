import { QuartzTransformerPlugin } from "../types";
import { QuartzPluginData } from "../vfile";
import { visit } from "unist-util-visit";
import { h } from "hastscript";
import { toHtml } from "hast-util-to-html";
import remark from 'remark';
import remarkRehype from 'remark-rehype';
import { Plugin } from 'unified';
import { Node } from "unist";
import { Code } from 'mdast'

interface RollResult {
  result: number;
  rolls: number[];
}

const rollDice = (dice: string): RollResult | null => {
  const diceRegex = /(\d+)d(\d+)([+-]\d+)?/;
  const match = dice.match(diceRegex);

  if (!match) {
    return null;
  }

  const numDice = parseInt(match[1], 10);
  const numSides = parseInt(match[2], 10);
  const modifier = parseInt(match[3] || "0", 10);

  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * numSides) + 1);
  }
  const result = rolls.reduce((a, b) => a + b, 0) + modifier;
  return { result, rolls };
};

const remarkDice: Plugin = () => (tree) => {
  visit(tree, "code", (node, index, parent) => {
    if (node) { // Проверка на наличие узла
      const codeNode = node as Code;
      if (codeNode.lang === "dice") {
        const dice = codeNode.value.trim();

        const rollHTML = h(
          "span.dice-roller-button",
          { "data-dice": dice },
          dice
        );

        const htmlValue = toHtml(rollHTML);

        // @ts-ignore type Node is not exactly what remark-rehype expects
        node.type = 'html';
        //node.value = htmlValue;
      }
    }
  });
};

const diceRoller: QuartzTransformerPlugin<QuartzPluginData> = () => {
  return {
    name: "diceRoller",
    markdownPlugins() {
      return [remarkDice];
    },
    externalResources() {
      return {
        js: [
          {
            script: `
            document.addEventListener('DOMContentLoaded', () => {
              document.querySelectorAll('.dice-roller-button').forEach(button => {
                button.addEventListener('click', () => {
                  const dice = button.getAttribute('data-dice');
                  if (dice) {
                    fetch('/api/dice-roll?dice=' + encodeURIComponent(dice))
                      .then(response => response.json())
                      .then(data => {
                        button.textContent = \`\${dice} = \${data.result} (\${data.rolls.join(', ')})\`;
                      });
                  }
                });
              });
            });
          `,
            loadTime: "afterDOMReady",
            contentType: "inline",
          },
        ],
      };
    },
  };
};

export default diceRoller;