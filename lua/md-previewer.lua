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
	vim.notify(msg, vim.log.levels.ERROR, { title = "md-previewer.nvim" })
end

local function ensure_executable(file_path)
	if vim.fn.has("unix") == 1 then
		local stat = vim.loop.fs_stat(file_path)
		if stat and bit.band(stat.mode, 73) == 0 then
			local cmd = string.format("chmod +x '%s'", file_path)
			local result = os.execute(cmd)
			if result ~= 0 then
				err("Failed to set executable permissions for " .. file_path)
				return false
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

local function start_job(bufnr)
	local binary_path = get_binary_path()
	if not binary_path then
		return
	end

	if not ensure_executable(binary_path) then
		err("Failed to set executable permissions for the binary")
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

function mdPreviewer.setup(user_config)
	config = vim.tbl_extend("force", config, user_config or {})

	vim.api.nvim_create_user_command("MdPreviewer", mdPreviewer.preview, {})

	vim.api.nvim_create_autocmd("BufUnload", {
		pattern = "*.md",
		callback = function(ev)
			if job and ev.buf == vim.api.nvim_get_current_buf() then
				stop_job()
			end
		end,
	})
end

return mdPreviewer
