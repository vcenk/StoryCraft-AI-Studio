from playwright.sync_api import sync_playwright

def verify_story_canvas():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Navigate to the app
            page.goto("http://localhost:3000")

            # Wait for the canvas to load (looking for the React Flow viewport)
            page.wait_for_selector(".react-flow__renderer")

            # Wait for our custom nodes to appear
            # We look for text "Chapter 1: The Beginning" which is in our mock data
            page.wait_for_selector("text=Chapter 1: The Beginning", timeout=10000)

            # Take a screenshot
            page.screenshot(path="verification/story_canvas.png", full_page=True)
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"Error during verification: {e}")
            # Take a screenshot even on failure if possible to see what happened
            try:
                page.screenshot(path="verification/error_state.png")
            except:
                pass
        finally:
            browser.close()

if __name__ == "__main__":
    verify_story_canvas()
