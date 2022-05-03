const path = require("path");
const models = require("./models");
const sanitize = require("sanitize-filename");
const archiver = require("archiver");
const fs = require("fs");
const Realm = require("realm");

(async () => {
	if (process.argv.length != 3) {
		console.log("Usage: node index.js <path to client.realm file>");
		return;
	}

	let realm_db = process.argv[2];

	const realm = await Realm.open({
		path: realm_db,
		schema: [
			models.BeatmapSet,
			models.File,
			models.Beatmap,
			models.KeyBinding,
			models.Ruleset,
			models.BeatmapDifficulty,
			models.BeatmapMetadata,
			models.RealmNamedFileUsage,
			models.RealmUser,
			models.BeatmapUserSettings
		],
		schemaVersion: 14,
	});

	if (!fs.existsSync("exports")) fs.mkdirSync("exports");

	const files_path = path.join(path.dirname(realm_db), "files/");
	realm.objects("BeatmapSet").forEach(async (set) => {
		const metadata = set.Beatmaps[0].Metadata;
		const filename = sanitize(
			`${set.OnlineID} ${metadata.Artist} - ${metadata.Title}`
		);

		const archive = archiver("zip");
		archive.pipe(fs.createWriteStream(`./exports/${filename}.osz`));

		set.Files.forEach((file) => {
			const hash = file.File.Hash;
			archive.file(
				path.join(
					files_path,
					hash.substr(0, 1),
					hash.substr(0, 2),
					hash
				),
				{ name: file.Filename }
			);
		});

		await archive.finalize();
		console.log(filename);
	});
	realm.close();
})().catch((error) => console.log(`An error occurred: ${error}`));
