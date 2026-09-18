<template>
	<div class="flex flex-col gap-1" role="group" :aria-label="label">
		<div class="mb-1 flex gap-0.5" role="group" :aria-label="translate('zx_builder_cta_mode')">
			<BuilderButton
				size="xs"
				:label="translate('zx_builder_cta_mode_form')"
				:aria-pressed="mode === 'form'"
				:variant="mode === 'form' ? 'primary' : 'secondary'"
				@click="setMode('form')"
			/>
			<BuilderButton
				size="xs"
				:label="translate('zx_builder_cta_mode_json')"
				:aria-pressed="mode === 'json'"
				:variant="mode === 'json' ? 'primary' : 'secondary'"
				@click="setMode('json')"
			/>
		</div>

		<template v-if="mode === 'form'">
			<div
				v-for="(cta, index) in ctas"
				:key="index"
				class="flex flex-col gap-1 rounded-xxs border-slim border-zaux-light p-2"
			>
				<div class="flex items-center gap-0.5">
					<button
						type="button"
						class="grid h-[24px] w-[24px] shrink-0 place-items-center rounded-xxs text-[10px] text-zaux-dark-grey hover:bg-zaux-light focus-visible:outline focus-visible:outline-1 focus-visible:outline-zaux-accent"
						:aria-expanded="!collapsed.has(index)"
						:aria-label="translate(collapsed.has(index) ? 'zx_builder_expand' : 'zx_builder_collapse')"
						@click="toggleCollapse(index)"
					>
						<span aria-hidden="true">{{ collapsed.has(index) ? "▸" : "▾" }}</span>
					</button>
					<span class="min-w-0 flex-1 truncate text-[11px] font-medium">{{ cta.label || (index + 1) }}</span>
					<div class="flex shrink-0 gap-0.5">
						<BuilderButton
							size="xs"
							variant="secondary"
							icon="chevron-up"
							iconOnly
							:label="translate('zx_builder_move_up')"
							:disabled="index === 0"
							@click="moveCTA(index, -1)"
						/>
						<BuilderButton
							size="xs"
							variant="secondary"
							icon="chevron-down"
							iconOnly
							:label="translate('zx_builder_move_down')"
							:disabled="index === ctas.length - 1"
							@click="moveCTA(index, 1)"
						/>
						<BuilderButton
							size="xs"
							variant="secondary"
							icon="duplicate"
							iconOnly
							:label="translate('zx_builder_duplicate')"
							@click="duplicateCTA(index)"
						/>
						<BuilderButton
							size="xs"
							variant="secondary"
							icon="delete"
							iconOnly
							:label="translate('zx_builder_cta_remove')"
							@click="removeCTA(index)"
						/>
					</div>
				</div>
				<template v-if="!collapsed.has(index)">
					<BuilderInput
						type="text"
						:label="translate('zx_builder_cta_label')"
						v-model="cta.label"
					/>
					<BuilderInput
						type="text"
						:label="translate('zx_builder_cta_href')"
						v-model="cta.href"
					/>
					<div class="grid grid-cols-2 gap-1">
						<BuilderInput
							type="select"
							:label="translate('zx_builder_cta_theme')"
							:options="themeOptions"
							v-model="cta.theme"
						/>
						<BuilderInput
							type="select"
							:label="translate('zx_builder_cta_size')"
							:options="sizeOptions"
							v-model="cta.size"
						/>
					</div>
					<div class="grid grid-cols-2 gap-1">
						<BuilderInput
							type="select"
							:label="translate('zx_builder_cta_icon')"
							:options="iconOptions"
							v-model="cta.iconName"
						/>
						<BuilderInput
							type="select"
							:label="translate('zx_builder_cta_action_icon')"
							:options="iconOptions"
							v-model="cta.actionIconName"
						/>
					</div>
				</template>
			</div>
			<div class="flex flex-wrap justify-end gap-0.5">
				<BuilderButton
					size="xs"
					variant="secondary"
					:label="translate('zx_builder_cta_clear')"
					@click="clearCTAs"
				/>
				<BuilderButton
					size="xs"
					variant="secondary"
					:label="translate('zx_builder_cta_add')"
					@click="addCTA"
				/>
			</div>
		</template>

		<template v-else>
			<BuilderCodeEditor
				v-model="jsonDraft"
				language="json"
				:label="translate('zx_builder_buttongroup')"
				:rows="6"
				@change="applyJson"
			/>
			<p
				v-if="invalid"
				class="mt-1 rounded-xxs bg-utility-error/10 p-1 text-[11px] leading-[1.6] text-utility-error"
			>
				{{ translate("zx_builder_invalid_json") }}
			</p>
		</template>
	</div>
</template>

<script>
	import { defineComponent, ref, computed, watch } from "vue";
	import BuilderButton from "../BuilderButton.vue";
	import BuilderInput from "./BuilderInput.vue";
	import BuilderCodeEditor from "./BuilderCodeEditor.vue";
	import { useTranslation } from "../../../composables/useTranslation.js";
	import { parseJson } from "../../../../domain/validation.js";
	import buttonMeta from "@zx_core/components/shared/button/ZButton.meta.js";
	import { iconSets } from "@integration/icon-options.js";

	function makeCta() {
		return {
			label: "Label di esempio",
			href: "#",
			theme: "primary",
			size: "s",
			iconName: "",
			actionIconName: "",
		};
	}

	function normalizeCta(cta) {
		return {
			label: cta?.label ?? "",
			href: cta?.href ?? "#",
			theme: cta?.theme ?? "primary",
			size: cta?.size ?? "s",
			iconName: cta?.iconName ?? "",
			actionIconName: cta?.actionIconName ?? "",
			hasIcon: !!cta?.iconName || !!cta?.hasIcon,
			actionIcon: !!cta?.actionIconName || !!cta?.actionIcon,
		};
	}

	export default defineComponent({
		components: {
			BuilderButton,
			BuilderInput,
			BuilderCodeEditor,
		},
		props: {
			label: { default: null },
			modelValue: { default: null },
		},
		emits: ["update:modelValue"],
		setup(props, { emit }) {
			const { translate } = useTranslation();
			const mode = ref("form");
			const ctas = ref([]);
			const jsonDraft = ref("");
			const invalid = ref(false);
			const collapsed = ref(new Set());

			const iconOptions = computed(() => [
				{ value: "", label: translate("zx_builder_cta_none") },
				...(iconSets.zaux ?? []),
			]);

			function stringifyCtas(value) {
				return JSON.stringify(Array.isArray(value) ? value : [], null, 2);
			}

			watch(
				() => props.modelValue,
				(value) => {
					const incoming = (Array.isArray(value) ? value : []).map(normalizeCta);
					const current = ctas.value.map(normalizeCta);
					if (JSON.stringify(incoming) !== JSON.stringify(current)) {
						ctas.value = incoming;
					}
					jsonDraft.value = stringifyCtas(value);
					invalid.value = false;
				},
				{ immediate: true },
			);

			watch(
				ctas,
				() => {
					if (mode.value !== "form") return;
					const outgoing = ctas.value.map(normalizeCta);
					const current = (Array.isArray(props.modelValue) ? props.modelValue : []).map(
						normalizeCta,
					);
					if (JSON.stringify(outgoing) === JSON.stringify(current)) return;
					emit("update:modelValue", outgoing);
				},
				{ deep: true },
			);

			function setMode(next) {
				if (next === mode.value) return;
				if (next === "json") {
					jsonDraft.value = stringifyCtas(props.modelValue);
					invalid.value = false;
				}
				mode.value = next;
			}

			function applyJson() {
				if (mode.value !== "json") return;
				try {
					const parsed = parseJson(jsonDraft.value);
					if (!Array.isArray(parsed)) throw new Error("zx_builder_invalid_json");
					invalid.value = false;
					emit("update:modelValue", parsed);
				} catch {
					invalid.value = true;
				}
			}

			function addCTA() {
				ctas.value.push(makeCta());
			}

			function clearCTAs() {
				ctas.value = [];
			}

			function removeCTA(index) {
				ctas.value.splice(index, 1);
			}

			function duplicateCTA(index) {
				const source = ctas.value[index];
				if (!source) return;
				ctas.value.splice(index + 1, 0, { ...source });
			}

			function moveCTA(index, direction) {
				const target = index + direction;
				if (target < 0 || target >= ctas.value.length) return;
				const copy = [...ctas.value];
				const [item] = copy.splice(index, 1);
				copy.splice(target, 0, item);
				ctas.value = copy;
			}

			function toggleCollapse(index) {
				if (collapsed.value.has(index)) collapsed.value.delete(index);
				else collapsed.value.add(index);
			}

			return {
				translate,
				mode,
				ctas,
				jsonDraft,
				invalid,
				themeOptions: buttonMeta.themes,
				sizeOptions: buttonMeta.sizes,
				iconOptions,
				setMode,
				applyJson,
				addCTA,
				clearCTAs,
				removeCTA,
				duplicateCTA,
				moveCTA,
				toggleCollapse,
				collapsed,
			};
		},
	});
</script>

