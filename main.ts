import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Notice,
	Modal,
} from "obsidian";
import nlp from "compromise";

interface NLPSearchSettings {
	enableAdvancedSearch: boolean;
}

const DEFAULT_SETTINGS: NLPSearchSettings = {
	enableAdvancedSearch: true,
};

export default class NLPSearchPlugin extends Plugin {
	settings: NLPSearchSettings;

	async onload() {
		console.log("Loading NLP Search Plugin");

		await this.loadSettings();

		this.addCommand({
			id: "nlp-search",
			name: "NLP Search",
			callback: () => this.nlpSearch(),
		});

		this.addSettingTab(new NLPSearchSettingTab(this.app, this));
	}

	onunload() {
		console.log("Unloading NLP Search Plugin");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async nlpSearch() {
		const query = await this.promptUser("Enter your search query:");
		if (!query) return;

		const parsedQuery = nlp(query).out("normal");
		const files = this.app.vault.getMarkdownFiles();
		const results = [];

		for (const file of files) {
			const content = await this.app.vault.read(file);
			if (content.includes(parsedQuery)) {
				results.push(file.path);
			}
		}

		new ResultModal(this.app, results).open();
	}

	async promptUser(prompt: string) {
		return new Promise<string | null>((resolve) => {
			const modal = new PromptModal(this.app, prompt, resolve);
			modal.open();
		});
	}
}

class NLPSearchSettingTab extends PluginSettingTab {
	plugin: NLPSearchPlugin;

	constructor(app: App, plugin: NLPSearchPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "NLP Search Plugin Settings" });

		new Setting(containerEl)
			.setName("Enable Advanced Search")
			.setDesc("Toggle to enable or disable advanced search features.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.enableAdvancedSearch)
					.onChange(async (value) => {
						this.plugin.settings.enableAdvancedSearch = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

class PromptModal extends Modal {
	prompt: string;
	resolve: (value: string | null) => void;

	constructor(
		app: App,
		prompt: string,
		resolve: (value: string | null) => void
	) {
		super(app);
		this.prompt = prompt;
		this.resolve = resolve;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.createEl("h2", { text: this.prompt });

		const input = contentEl.createEl("input", { type: "text" });
		input.style.width = "100%";
		input.style.marginBottom = "1rem";

		input.addEventListener("keydown", (event) => {
			if (event.key === "Enter") {
				this.resolve(input.value);
				this.close();
			}
		});

		const button = contentEl.createEl("button", { text: "OK" });
		button.addEventListener("click", () => {
			this.resolve(input.value);
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	close() {
		super.close();
	}
}

class ResultModal extends Modal {
	results: string[];
	constructor(app: App, results: string[]) {
		super(app);
		this.results = results;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Search Results" });

		if (this.results.length === 0) {
			contentEl.createEl("p", { text: "No results found." });
		} else {
			const list = contentEl.createEl("ul");

			this.results.forEach((result) => {
				const listItem = list.createEl("li", { text: result });
				listItem.addEventListener("click", () => {
					this.app.workspace.openLinkText(result, "/", true);
				});
			});
			const closeButton = contentEl.createEl("button", { text: "Close" });
			closeButton.addEventListener("click", () => {
				this.close();
			});
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
