import { onMount, createSignal, batch, Show, Switch, Match, createMemo, onCleanup } from 'solid-js';
import { Header, ContextMenu, Menu, MenuItem, SelectMidi, InstrumentSelect, Piano, Drums } from '../components';
import { PitchedPlayer, NoteUrlGain, Dynamic, dynamicToGain } from '../audio/PitchedPlayer';
import { Player } from '../audio/Player';
import { Note } from 'tonal';
import styles from './Play.module.css';

type AnyPlayer = PitchedPlayer | Player;

function createPlayer(index: SampleIndex, category: string, name: string): AnyPlayer {
	const samples = index[category][name];
	switch (category) {
		case 'strings': {
			const res = new PitchedPlayer();

			const noteUrls: NoteUrlGain[] = [];
			samples.forEach(sample => {
				const note = sample.substring(3);
				const freq = Note.freq(note);
				if (!freq) {
					console.warn('could not parse frequency for sample', sample);
					return;
				}
				const url = `${SAMPLE_BASE}/strings/Splendid Grand Piano/${encodeURIComponent(sample)}.ogg`;
				const dynamic = sample.substring(0, 2).toLowerCase() as Dynamic;
				const gain = dynamicToGain(dynamic);
				noteUrls.push({ freq, url, gain });
			});
			res.loadLayers(noteUrls);
			return res;
		}
		case 'percussion': {
			const res = new Player();
			samples.forEach(s =>
				res.loadUrl(s, `${SAMPLE_BASE}/${category}/${name}/${s}.ogg`)
			);
			return res;
		}
		default:
			throw new Error ('dunno how to load instrument in ' + category);
	}
}

interface InstrumentProps {
	name: string;
	player?: Player;
	midi?: MIDIInput;
};
function Instrument(props: InstrumentProps) {
	return (
		<Switch>
			<Match when={props.player instanceof PitchedPlayer}>
				<Piano player={props.player as PitchedPlayer} midi={props.midi} />
			</Match>
			<Match when={props.player instanceof Player}>
				<Drums player={props.player as Player} midi={props.midi} name={props.name} />
			</Match>
		</Switch>
	);
}

export interface PlayProps {
	index?: SampleIndex;
};
export function Play(props: PlayProps) {
	const [midi, setMidi] = createSignal<MIDIInput | undefined>();
	const [drawerOpen, setDrawerOpen] = createSignal<boolean>(false);
	const [headerHeight, setHeaderHeight] = createSignal(0);
	const [category, setCategory] = createSignal('strings');
	const [name, setName] = createSignal('Splendid Grand Piano');

	let headerRef: HTMLElement | undefined;

	function onKeyDown(ev: KeyboardEvent) {
		if (ev.key == 'Escape' && drawerOpen()) {
			ev.preventDefault();
			setDrawerOpen(false);
		}
	}

	onMount(() => {
		if (!headerRef) return;

		const height = headerRef.getBoundingClientRect().height;
		const margin = getComputedStyle(headerRef).margin;
		setHeaderHeight(height + parseFloat(margin) * 2);
	});

	onMount(() => {
		document.addEventListener('keydown', onKeyDown);
		onCleanup(() => document.removeEventListener('keydown', onKeyDown));
	});

	const player = createMemo(() => {
		if (!props.index) return;

		return createPlayer(props.index, category(), name());
	});

	const menu = (
		<Menu>
			<MenuItem>
				<SelectMidi onSelect={setMidi} />
			</MenuItem>
		</Menu>
	);

	// onOpen={listMidi}
	return (
		<>
			<Header ref={headerRef} onToggle={() => setDrawerOpen(!drawerOpen())} />
			<Show when={drawerOpen()}>
				<aside class={styles.drawer} style={{ 'margin-top': `${headerHeight()}px` }}>
					<InstrumentSelect
						index={props.index}
						onSelect={(category, name) => {
							batch(() => {
								setCategory(category);
								setName(name);
							});
						}}
					/>
				</aside>
			</Show>
			<main>
				<ContextMenu menu={menu} class={styles.main}>
					<Instrument player={player()} midi={midi()} name={name()} />
				</ContextMenu>
			</main>
		</>
	);
}
