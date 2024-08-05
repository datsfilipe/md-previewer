-- @class MdPreviewer
local mdPreviewer = {}

-- @class Config
-- @field quiet boolean
local config = {
	quiet = false,
}

mdPreviewer.config = config

local job = nil

local function err(msg)
	vim.notify(msg, vim.log.levels.ERROR, { title = "md-previewer" })
end

local function ensure_executables(dir_path)
	if vim.fn.has("unix") == 1 then
		local handle = vim.loop.fs_scandir(dir_path)
		if not handle then
			err("Failed to scan directory: " .. dir_path)
			return false
		end

		while true do
			local name, type = vim.loop.fs_scandir_next(handle)
			if not name then
				break
			end

			if type == "file" then
				local file_path = dir_path .. "/" .. name
				local stat = vim.loop.fs_stat(file_path)
				if stat and bit.band(stat.mode, 73) == 0 then -- Check if file is not executable (73 = 111 in octal)
					local cmd = string.format("chmod +x '%s'", file_path)
					local result = os.execute(cmd)
					if result ~= 0 then
						err("Failed to set executable permissions for " .. file_path)
						return false
					end
				end
			end
		end
	end
	return true
end

local function get_binary_name()
	local system = vim.loop.os_uname().sysname:lower()
	local arch = vim.loop.os_uname().machine:lower()

	if system == "linux" then
		if arch:match("arm") or arch:match("aarch64") then
			return "md-previewer-arm"
		else
			return "md-previewer"
		end
	elseif system == "darwin" then
		if arch:match("arm") then
			return "md-previewer-mac-arm"
		else
			return "md-previewer-mac"
		end
	elseif system:match("windows") then
		return "md-previewer-win.exe"
	else
		err("Unsupported operating system")
		return nil
	end
end

local function get_binary_path()
	local binary_name = get_binary_name()
	if not binary_name then
		return nil
	end

	local plugin_path = debug.getinfo(1, "S").source:sub(2):match("(.*/)"):sub(1, -5)
	return plugin_path .. "bin/" .. binary_name
end

local function check_version()
	local bin_dir = vim.fn.stdpath("data") .. "/lazy/md-previewer/bin"
	local version_file = bin_dir .. "/version_info.txt"
	local file = io.open(version_file, "r")
	if file then
		local version = file:read("*all")
		file:close()
		return version
	end
	return nil
end

local function start_job(bufnr)
	local binary_path = get_binary_path()
	if not binary_path then
		return
	end

	local dir_path = binary_path:match("(.*)/")
	if not ensure_executables(dir_path) then
		err("Failed to set executable permissions for binaries")
		return
	end

	local file_path = vim.api.nvim_buf_get_name(bufnr)
	local args = { "--file=" .. file_path }

	if config.quiet then
		table.insert(args, "--quiet")
	end

	job = vim.fn.jobstart({ binary_path, unpack(args) }, {
		on_exit = function(_, exit_code)
			if exit_code ~= 0 then
				err("Markdown previewer exited with code " .. exit_code)
			end
			job = nil
		end,
	})

	if job == 0 then
		err("Failed to start markdown previewer job")
	elseif job == -1 then
		err("Markdown previewer command is not executable")
	end
end

local function stop_job()
	if job then
		vim.fn.jobstop(job)
		job = nil
	end
end

function mdPreviewer.preview()
	local bufnr = vim.api.nvim_get_current_buf()
	if vim.bo[bufnr].filetype ~= "markdown" then
		err("Current buffer is not a markdown file")
		return
	end

	if job then
		stop_job()
	end
	start_job(bufnr)
end

function mdPreviewer.version()
	print(check_version())
end

function mdPreviewer.setup(user_config)
	config = vim.tbl_extend("force", config, user_config or {})

	vim.api.nvim_create_user_command("MdPreviewer", "lua require('md-previewer').preview()", {})
	vim.api.nvim_create_user_command("MdPreviewerStop", "lua require('md-previewer').stop()", {})
	vim.api.nvim_create_user_command("MdPreviewerVersion", "lua require('md-previewer').version()", {})

	vim.api.nvim_create_autocmd("BufUnload", {
		pattern = "*.md",
		callback = function(ev)
			if job and ev.buf == vim.api.nvim_get_current_buf() then
				stop_job()
			end
		end,
	})

	local version = check_version()
	if version then
		print("Markdown Previewer version: " .. version)
	else
		print("Markdown Previewer version information not available")
	end
end

return mdPreviewer
