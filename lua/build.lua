local curl = require("plenary.curl")
local Path = require("plenary.path")

local function download_file(url, output)
	local res = curl.get(url, {
		output = output,
		follow_redirects = true,
	})
	if res.status ~= 200 then
		error(string.format("Failed to download %s. Status: %d", url, res.status))
	end
end

local function get_latest_release()
	local res = curl.get("https://api.github.com/repos/datsfilipe/md-previewer/releases/latest", {
		headers = {
			Accept = "application/vnd.github.v3+json",
			["User-Agent"] = "Neovim Plugin Installer",
		},
	})
	if res.status ~= 200 then
		error(string.format("Failed to fetch latest release info. Status: %d", res.status))
	end
	return vim.fn.json_decode(res.body)
end

local function get_asset_url(assets, name)
	for _, asset in ipairs(assets) do
		if asset.name == name then
			return asset.browser_download_url
		end
	end
	return nil
end

local function read_version_info(file_path)
	local file = io.open(file_path, "r")
	if file then
		local version = file:read("*all")
		file:close()
		return version
	end
	return nil
end

local function write_version_info(file_path, version)
	local file = io.open(file_path, "w")
	if file then
		file:write(version)
		file:close()
		return true
	end
	return false
end

local function main()
	print("Fetching latest release info...")
	local release = get_latest_release()

	local bin_dir = Path:new(vim.fn.stdpath("data"), "lazy", "md-previewer", "bin")
	bin_dir:mkdir({ parents = true })

	local version_file = bin_dir:joinpath("version_info.txt")
	local current_version = read_version_info(version_file.filename)

	if current_version == release.tag_name then
		print("Already up to date. Version: " .. current_version)
		return
	end

	local binaries = {
		"md-previewer",
		"md-previewer-arm",
		"md-previewer-mac",
		"md-previewer-mac-arm",
		"md-previewer-server",
		"md-previewer-server-arm",
		"md-previewer-server-mac",
		"md-previewer-server-mac-arm",
		"md-previewer-server.exe",
		"md-previewer-win.exe",
	}

	for _, binary in ipairs(binaries) do
		local url = get_asset_url(release.assets, binary)
		if url then
			print("Downloading " .. binary .. "...")
			local output = bin_dir:joinpath(binary)
			local success, err = pcall(download_file, url, output.filename)
			if not success then
				print("Error downloading " .. binary .. ": " .. err)
			else
				print("Successfully downloaded " .. binary)
			end
		else
			print("Warning: " .. binary .. " not found in the release assets.")
		end
	end

	if write_version_info(version_file.filename, release.tag_name) then
		print("Updated version info: " .. release.tag_name)
	else
		print("Failed to write version info")
	end

	print("Build complete!")
end

main()
