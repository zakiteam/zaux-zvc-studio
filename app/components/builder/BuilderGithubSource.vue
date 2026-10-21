<template>
	<!-- GitHub repository as a PHP conversion source: token, repository, branch and components/virtual folder. Read only. -->
	<section class="flex max-w-[880px] flex-col gap-1.5 rounded-xs border-slim border-zaux-light-grey bg-zaux-white p-2">
		<!--		
		<div v-if="serverToken" class="flex flex-wrap items-center gap-1 rounded-xxs justify-end  p-1 text-[11px] text-zaux-dark-grey">
			<BuilderButton size="xs" variant="alt1" :label="translate(personal ? 'zx_builder_github_use_server' : 'zx_builder_github_use_personal')" :disabled="busy" @click="personal = !personal" />
		</div>
	-->
		<form class="grid items-end gap-1 max-[700px]:grid-cols-1" :class="personal ? 'grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]' : 'grid-cols-[minmax(0,1fr)_auto]'" @submit.prevent="connect">
			<label v-if="personal" class="flex min-w-0 flex-col gap-0.25 text-[11px] text-zaux-dark-grey">
				{{ translate('zx_builder_github_token') }}
				<BuilderInput v-model="token" type="password" autocomplete="off" :label="translate('zx_builder_github_token')" :placeholder="'github_pat_…'" :disabled="busy" />
			</label>
			<label class="flex min-w-0 flex-col gap-0.25 text-[11px] text-zaux-dark-grey">
				{{ translate('zx_builder_github_owner') }}
				<BuilderInput v-model="owner" :label="translate('zx_builder_github_owner')" :disabled="busy" />
			</label>
			<BuilderButton size="xs" variant="primary" icon="refresh" :label="translate('zx_builder_github_connect')" :disabled="busy || !ready" @click="connect" />
		</form>
		<div v-if="personal" class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zaux-dark-grey">
			<label class="flex cursor-pointer items-center gap-1 text-zaux-dark">
				<input v-model="remember" type="checkbox" class="!w-auto accent-zaux-accent" />
				{{ translate('zx_builder_github_remember') }}
			</label>
			<span>{{ translate('zx_builder_github_token_hint') }}</span>
		</div>

		<p v-if="error" role="alert" class="rounded-xs bg-utility-error/10 p-1.5 text-[11px] text-utility-error">{{ translate(error) }}</p>
		<p v-if="busy" role="status" class="text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_loading') }}</p>

		<template v-if="repos">
			<BuilderInput v-model="search" type="search" :label="translate('zx_builder_github_search')" :placeholder="translate('zx_builder_github_search')" />
			<ul role="listbox" :aria-label="translate('zx_builder_github_repos')" class="m-0 max-h-[240px] list-none overflow-auto rounded-xxs bg-zaux-light p-0.5">
				<li v-for="repo in visibleRepos" :key="repo.fullName" role="option" :aria-selected="selected?.fullName === repo.fullName">
					<button type="button" class="flex w-full min-w-0 items-center gap-1 rounded-xxs px-1 py-0.5 text-left focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
						:class="selected?.fullName === repo.fullName ? 'bg-zaux-white font-semibold' : 'hover:bg-zaux-white'" :disabled="busy" @click="selectRepo(repo)">
						<span class="truncate text-[12px]">{{ repo.name }}</span>
						<span v-if="repo.private" class="shrink-0 rounded-xxs bg-zaux-white px-0.5 text-[9px] text-zaux-dark-grey">{{ translate('zx_builder_github_private') }}</span>
						<span class="ml-auto shrink-0 font-mono text-[9px] text-zaux-dark-grey">{{ repo.defaultBranch }}</span>
					</button>
				</li>
				<li v-if="!visibleRepos.length" class="px-1 py-1 text-[11px] text-zaux-dark-grey">{{ translate('zx_builder_github_no_repos') }}</li>
			</ul>
		</template>

		<div v-if="selected" class="grid grid-cols-2 gap-1 max-[700px]:grid-cols-1">
			<label class="flex min-w-0 flex-col gap-0.25 text-[11px] text-zaux-dark-grey">
				{{ translate('zx_builder_github_branch') }}
				<BuilderInput v-model="branch" type="select" :label="translate('zx_builder_github_branch')" :options="branches.map(name => ({ value: name, label: name }))" :disabled="busy" />
			</label>
			<label class="flex min-w-0 flex-col gap-0.25 text-[11px] text-zaux-dark-grey">
				{{ translate('zx_builder_github_folder') }}
				<BuilderInput v-model="root" type="select" :label="translate('zx_builder_github_folder')" :options="roots.map(path => ({ value: path, label: path }))" :disabled="busy || !roots.length" />
			</label>
		</div>
		<p v-if="selected && !busy && filesLoaded && !roots.length" class="text-[11px] text-zaux-dark-grey">{{ translate(truncated ? 'zx_builder_github_truncated' : 'zx_builder_github_no_virtual') }}</p>
		<div v-if="selected" class="flex justify-end">
			<BuilderButton size="xs" variant="primary" icon="enter" :label="translate('zx_builder_github_convert')" :disabled="busy || disabled || !root" @click="convert" />
		</div>
	</section>
</template>

<script>
	import { computed, defineComponent, ref, watch } from "vue";
	import { useTranslation } from "../../composables/useTranslation.js";
	import { defaultGithubOwner, githubServerStatus, listBranches, listRepositories, repositoryFiles, storeGithubToken, storedGithubToken } from "../../services/github-source.js";
	import { virtualRoots, virtualSources } from "../../services/php-converter.js";

	// Emits `convert` with a PHP conversion source (virtualSources.github).
	export default defineComponent({
		name: "BuilderGithubSource",
		props: {
			disabled: Boolean,
		},
		emits: ["convert"],
		setup(props, { emit }) {
			const { translate, language } = useTranslation();
			const stored = storedGithubToken();
			const token = ref(stored);
			const remember = ref(!!stored);
			// Server token available: used unless the user switches to a personal one.
			const serverToken = ref(false);
			const personal = ref(true);
			githubServerStatus().then(configured => {
				serverToken.value = configured;
				if (configured && !stored) personal.value = false;
			});
			// null = server token through /api/github/proxy.
			const activeToken = () => personal.value ? token.value.trim() : null;
			const ready = computed(() => !!owner.value.trim() && (!personal.value || !!token.value.trim()));
			const owner = ref(defaultGithubOwner);
			const repos = ref(null);
			const search = ref("");
			const selected = ref(null);
			const branches = ref([]);
			const branch = ref("");
			const roots = ref([]);
			const root = ref("");
			const truncated = ref(false);
			const filesLoaded = ref(false);
			const busy = ref(false);
			const error = ref("");
			// Requests answered after a newer selection are ignored.
			let generation = 0;
			const visibleRepos = computed(() => {
				const query = search.value.trim().toLocaleLowerCase(language.value);
				return (repos.value ?? []).filter(repo => !query || [repo.name, repo.description].some(value => value.toLocaleLowerCase(language.value).includes(query)));
			});
			const message = exception => typeof exception?.message === "string" && exception.message.startsWith("zx_") ? exception.message : "zx_builder_github_error";
			async function run(task) {
				busy.value = true; error.value = "";
				try { await task(); }
				catch (exception) { error.value = message(exception); }
				finally { busy.value = false; }
			}
			// The token stays in sessionStorage only while "remember" is checked.
			watch([token, remember], () => storeGithubToken(remember.value ? token.value.trim() : ""));
			function connect() {
				if (busy.value || !ready.value) return;
				return run(async () => {
					selected.value = null;
					repos.value = await listRepositories(activeToken(), owner.value.trim());
				});
			}
			async function loadFolders() {
				const current = ++generation;
				filesLoaded.value = false; roots.value = []; root.value = "";
				const { paths, truncated: cut } = await repositoryFiles(activeToken(), owner.value.trim(), selected.value.name, branch.value);
				if (current !== generation) return;
				truncated.value = cut;
				roots.value = virtualRoots(paths);
				root.value = roots.value[0] ?? "";
				filesLoaded.value = true;
			}
			function selectRepo(repo) {
				return run(async () => {
					selected.value = repo;
					branch.value = repo.defaultBranch;
					branches.value = [repo.defaultBranch];
					const names = await listBranches(activeToken(), owner.value.trim(), repo.name);
					branches.value = names.includes(repo.defaultBranch) ? names : [repo.defaultBranch, ...names];
					await loadFolders();
				});
			}
			watch(branch, (value, previous) => {
				// selectRepo loads the folders itself (busy); only a user branch change reloads here.
				if (selected.value && previous && value !== previous && !busy.value) run(loadFolders);
			});
			function convert() {
				if (!selected.value || !root.value) return;
				emit("convert", virtualSources.github({ token: activeToken(), owner: owner.value.trim(), repo: selected.value.name, ref: branch.value, root: root.value }));
			}
			// Another token may see other repositories: start again from the list.
			watch(personal, () => { generation++; repos.value = null; selected.value = null; });
			return { translate, token, remember, serverToken, personal, ready, owner, repos, search, visibleRepos, selected, branches, branch, roots, root, truncated, filesLoaded, busy, error, connect, selectRepo, convert };
		},
	});
</script>
